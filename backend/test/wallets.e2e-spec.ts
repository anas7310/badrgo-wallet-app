import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/modules/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { DataSource } from 'typeorm';

describe('Wallets (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let userId: string;
  let walletId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    dataSource = moduleFixture.get(DataSource);

    
    const userRes = await request(app.getHttpServer())
      .post('/users')
      .send({
        name: 'Test User',
        email: `testuser_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`,
        phone: `+1${Math.floor(Math.random() * 1000000000)}`,
      });
    userId = userRes.body.id;

    
    const walletRes = await request(app.getHttpServer())
      .post('/wallets')
      .send({ userId, currency: 'USD' });
    walletId = walletRes.body.id;
  });

  afterAll(async () => {
    
    await dataSource.query(`DELETE FROM "transaction" WHERE "walletId" = $1`, [walletId]);
    await dataSource.query(`DELETE FROM "wallet" WHERE id = $1`, [walletId]);
    await dataSource.query(`DELETE FROM "user" WHERE id = $1`, [userId]);
    await app.close();
  });

  

  describe('POST /wallets/:id/credit', () => {
    it('should credit a wallet and return a transaction with correct balanceBefore/balanceAfter', async () => {
      const res = await request(app.getHttpServer())
        .post(`/wallets/${walletId}/credit`)
        .send({
          amount: 10000, 
          referenceId: `credit-test-${Date.now()}`,
          description: 'Test credit',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        walletId,
        type: 'CREDIT',
        amount: 10000,
        balanceBefore: 0,
        balanceAfter: 10000,
      });
      expect(res.body.id).toBeDefined();
      expect(res.body.referenceId).toBeDefined();
    });

    it('should reject credit with missing referenceId (validation)', async () => {
      await request(app.getHttpServer())
        .post(`/wallets/${walletId}/credit`)
        .send({ amount: 500 }) 
        .expect(400);
    });

    it('should reject credit with amount = 0', async () => {
      await request(app.getHttpServer())
        .post(`/wallets/${walletId}/credit`)
        .send({ amount: 0, referenceId: 'zero-amount-test' })
        .expect(400);
    });
  });

  

  describe('POST /wallets/:id/debit', () => {
    it('should debit a wallet and return a transaction with correct balance tracking', async () => {
      
      const refCredit = `debit-setup-credit-${Date.now()}`;
      await request(app.getHttpServer())
        .post(`/wallets/${walletId}/credit`)
        .send({ amount: 5000, referenceId: refCredit });

      const res = await request(app.getHttpServer())
        .post(`/wallets/${walletId}/debit`)
        .send({
          amount: 2000, 
          referenceId: `debit-test-${Date.now()}`,
          description: 'Test debit',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        walletId,
        type: 'DEBIT',
        amount: 2000,
      });
      expect(res.body.balanceAfter).toBe(res.body.balanceBefore - 2000);
    });

    it('should reject debit when balance is insufficient', async () => {
      const res = await request(app.getHttpServer())
        .post(`/wallets/${walletId}/debit`)
        .send({
          amount: 999999999, 
          referenceId: `insufficient-${Date.now()}`,
        })
        .expect(400);

      expect(res.body.message).toMatch(/insufficient balance/i);
    });

    it('should reject debit with negative amount', async () => {
      await request(app.getHttpServer())
        .post(`/wallets/${walletId}/debit`)
        .send({ amount: -100, referenceId: 'negative-amount' })
        .expect(400);
    });
  });

  

  describe('Idempotency — duplicate referenceId', () => {
    it('should return the original transaction and NOT credit balance twice for duplicate referenceId', async () => {
      const referenceId = `idempotency-test-${Date.now()}`;
      const amount = 3000;

      
      const walletBefore = await request(app.getHttpServer())
        .get(`/wallets/${walletId}`)
        .expect(200);
      const balanceBefore = walletBefore.body.balance;

      
      const first = await request(app.getHttpServer())
        .post(`/wallets/${walletId}/credit`)
        .send({ amount, referenceId })
        .expect(201);

      
      const second = await request(app.getHttpServer())
        .post(`/wallets/${walletId}/credit`)
        .send({ amount, referenceId })
        .expect(201);

      
      expect(first.body.id).toBe(second.body.id);
      expect(Number(first.body.balanceAfter)).toBe(Number(second.body.balanceAfter));

      
      const walletAfter = await request(app.getHttpServer())
        .get(`/wallets/${walletId}`)
        .expect(200);

      expect(Number(walletAfter.body.balance)).toBe(Number(balanceBefore) + amount);
    });

    it('should also be idempotent for debit operations', async () => {
      const referenceId = `idempotency-debit-${Date.now()}`;
      const amount = 500;

      const walletBefore = await request(app.getHttpServer())
        .get(`/wallets/${walletId}`)
        .expect(200);
      const balanceBefore = Number(walletBefore.body.balance);

      const first = await request(app.getHttpServer())
        .post(`/wallets/${walletId}/debit`)
        .send({ amount, referenceId })
        .expect(201);

      const second = await request(app.getHttpServer())
        .post(`/wallets/${walletId}/debit`)
        .send({ amount, referenceId })
        .expect(201);

      expect(first.body.id).toBe(second.body.id);

      const walletAfter = await request(app.getHttpServer())
        .get(`/wallets/${walletId}`)
        .expect(200);

      
      expect(Number(walletAfter.body.balance)).toBe(balanceBefore - amount);
    });
  });

  

  describe('GET /wallets/:id/transactions', () => {
    it('should return transactions in descending order by createdAt', async () => {
      const res = await request(app.getHttpServer())
        .get(`/wallets/${walletId}/transactions`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 1) {
        const dates = res.body.map((tx: any) => new Date(tx.createdAt).getTime());
        for (let i = 1; i < dates.length; i++) {
          expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
        }
      }
    });
  });
});
