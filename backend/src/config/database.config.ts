import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Wallet } from '../modules/wallets/entities/wallet.entity';
import { Transaction } from '../modules/transactions/entities/transaction.entity';
import { IdempotencyRecord } from '../modules/idempotency/entities/idempotency-record.entity';
import * as dotenv from 'dotenv';




dotenv.config();

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'badrgo_wallet',
  entities: [User, Wallet, Transaction, IdempotencyRecord],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
};
