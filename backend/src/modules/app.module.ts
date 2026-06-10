import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { databaseConfig } from '../config/database.config';
import configuration from '../config/configuration';

import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { ReportsModule } from './reports/reports.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    TypeOrmModule.forRoot(databaseConfig),

    UsersModule,
    WalletsModule,
    ReportsModule,
    TransactionsModule,
  ],
})
export class AppModule {}