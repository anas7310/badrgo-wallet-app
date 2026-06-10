import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { WalletStatus } from '../../common/enums/wallet-status.enum';

@Injectable()
export class ReportsService {
  constructor(private dataSource: DataSource) {}

    async dailySummary(date: string): Promise<{
    date: string;
    creditsByCurrency: { currency: string; amount: number }[];
    debitsByCurrency: { currency: string; amount: number }[];
    transactionCount: number;
    activeWallets: number;
  }> {
    const txRepo = this.dataSource.getRepository(Transaction);
    const walletRepo = this.dataSource.getRepository(Wallet);

    const transactions = await txRepo
      .createQueryBuilder('tx')
      .where('DATE(tx.createdAt) = :date', { date })
      .getMany();

    const walletIdsWithActivity = [
      ...new Set(transactions.map((t) => t.walletId)),
    ];

    let activeWallets = 0;
    const creditsByCurrency: Record<string, number> = {};
    const debitsByCurrency: Record<string, number> = {};

    if (walletIdsWithActivity.length > 0) {
      const wallets = await walletRepo
        .createQueryBuilder('wallet')
        .where('wallet.id IN (:...ids)', { ids: walletIdsWithActivity })
        .getMany();

      const walletCurrencyMap = new Map(wallets.map(w => [w.id, w.currency]));
      activeWallets = wallets.filter(w => w.status === WalletStatus.ACTIVE).length;

      for (const tx of transactions) {
        const currency = walletCurrencyMap.get(tx.walletId) || 'USD';
        if (tx.type === TransactionType.CREDIT) {
          creditsByCurrency[currency] = (creditsByCurrency[currency] || 0) + Number(tx.amount);
        } else {
          debitsByCurrency[currency] = (debitsByCurrency[currency] || 0) + Number(tx.amount);
        }
      }
    }

    return {
      date,
      creditsByCurrency: Object.entries(creditsByCurrency).map(([currency, amount]) => ({ currency, amount })),
      debitsByCurrency: Object.entries(debitsByCurrency).map(([currency, amount]) => ({ currency, amount })),
      transactionCount: transactions.length,
      activeWallets,
    };
  }
}