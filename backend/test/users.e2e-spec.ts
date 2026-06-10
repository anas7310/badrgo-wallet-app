import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/modules/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { DataSource } from 'typeorm';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await dataSource.query(`DELETE FROM "user" WHERE id = $1`, [id]);
    }
    await app.close();
  });

  describe('POST /users', () => {
    it('should create a user and return the created entity', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Anas Khan',
          email: `anas_${Date.now()}@example.com`,
          phone: '+923001234567',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Anas Khan');
      expect(res.body.status).toBe('ACTIVE');
      createdUserIds.push(res.body.id);
    });

    it('should reject duplicate email', async () => {
      const email = `dup_${Date.now()}@example.com`;
      const first = await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'User A', email, phone: '+1111111111' })
        .expect(201);
      createdUserIds.push(first.body.id);

      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'User B', email, phone: '+2222222222' })
        .expect(500); 
    });

    it('should reject invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Bad User', email: 'not-an-email', phone: '+1234567890' })
        .expect(400);
    });

    it('should reject missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Incomplete' })
        .expect(400);
    });
  });

  describe('GET /users', () => {
    it('should return an array of users', async () => {
      const res = await request(app.getHttpServer()).get('/users').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
