import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { TransactionType } from '../../common/enums/transaction-type.enum';
import { WalletStatus } from '../../common/enums/wallet-status.enum';
import { CreateWalletDto } from './dto/create-wallet.dto';

@Injectable()
export class WalletsService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepo: Repository<Wallet>,
    @InjectRepository(Transaction)
    private txRepo: Repository<Transaction>,
    private dataSource: DataSource,
  ) {}

  create(dto: CreateWalletDto) {
    const wallet = this.walletRepo.create({
      userId: dto.userId,
      currency: dto.currency ?? 'USD',
    });
    return this.walletRepo.save(wallet);
  }

  async findById(id: string): Promise<Wallet> {
    const wallet = await this.walletRepo.findOne({ where: { id } });
    if (!wallet) throw new NotFoundException(`Wallet ${id} not found`);
    return wallet;
  }

    async credit(
    walletId: string,
    amount: number,
    referenceId: string,
    description?: string,
  ): Promise<Transaction> {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) throw new NotFoundException(`Wallet ${walletId} not found`);

      
      if (wallet.status !== WalletStatus.ACTIVE) {
        throw new BadRequestException(
          `Wallet is ${wallet.status.toLowerCase()} and cannot receive credits`,
        );
      }

      const balanceBefore = Number(wallet.balance);
      const balanceAfter = balanceBefore + Number(amount);

      wallet.balance = balanceAfter;
      await manager.save(wallet);

      const tx = manager.create(Transaction, {
        walletId,
        type: TransactionType.CREDIT,
        amount: Number(amount),
        balanceBefore,
        balanceAfter,
        referenceId,
        description,
      });

      return manager.save(tx);
    });
  }

    async debit(
    walletId: string,
    amount: number,
    referenceId: string,
    description?: string,
  ): Promise<Transaction> {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) throw new NotFoundException(`Wallet ${walletId} not found`);

      
      if (wallet.status !== WalletStatus.ACTIVE) {
        throw new BadRequestException(
          `Wallet is ${wallet.status.toLowerCase()} and cannot be debited`,
        );
      }

      const balanceBefore = Number(wallet.balance);

      
      if (balanceBefore < Number(amount)) {
        throw new BadRequestException(
          `Insufficient balance. Available: ${(balanceBefore / 100).toFixed(2)} ${wallet.currency}, requested: ${(Number(amount) / 100).toFixed(2)} ${wallet.currency}`,
        );
      }

      const balanceAfter = balanceBefore - Number(amount);

      wallet.balance = balanceAfter;
      await manager.save(wallet);

      const tx = manager.create(Transaction, {
        walletId,
        type: TransactionType.DEBIT,
        amount: Number(amount),
        balanceBefore,
        balanceAfter,
        referenceId,
        description,
      });

      return manager.save(tx);
    });
  }

  async getTransactions(walletId: string): Promise<Transaction[]> {
    
    await this.findById(walletId);
    return this.txRepo.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
    });
  }

    async getStats(): Promise<{
    totalWallets: number;
    activeWallets: number;
    balancesByCurrency: { currency: string; balance: number }[];
  }> {
    const result = await this.walletRepo
      .createQueryBuilder('wallet')
      .select('COUNT(wallet.id)', 'totalWallets')
      .addSelect(
        `COUNT(CASE WHEN wallet.status = 'ACTIVE' THEN 1 END)`,
        'activeWallets',
      )
      .getRawOne();

    const currencyTotals = await this.walletRepo
      .createQueryBuilder('wallet')
      .select('wallet.currency', 'currency')
      .addSelect('COALESCE(SUM(wallet.balance), 0)', 'balance')
      .groupBy('wallet.currency')
      .getRawMany();

    return {
      totalWallets: parseInt(result.totalWallets, 10),
      activeWallets: parseInt(result.activeWallets, 10),
      balancesByCurrency: currencyTotals.map((row) => ({
        currency: row.currency,
        balance: parseInt(row.balance, 10),
      })),
    };
  }
}