import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Wallet } from '../modules/wallets/entities/wallet.entity';
import { Transaction } from '../modules/transactions/entities/transaction.entity';
import { IdempotencyRecord } from '../modules/idempotency/entities/idempotency-record.entity';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'badrgo',
  password: process.env.DB_PASSWORD ?? 'badrgo_secret',
  database: process.env.DB_NAME ?? 'badrgo_wallet',
  entities: [User, Wallet, Transaction, IdempotencyRecord],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
