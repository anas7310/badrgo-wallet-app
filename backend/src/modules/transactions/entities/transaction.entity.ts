import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { TransactionType } from '../../../common/enums/transaction-type.enum';

@Entity()


@Index('idx_transaction_wallet_created', ['walletId', 'createdAt'])

@Index('idx_transaction_created', ['createdAt'])

@Index('idx_transaction_wallet_type', ['walletId', 'type'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  walletId: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
  wallet: Wallet;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({ type: 'bigint' })
  amount: number;

  @Column({ type: 'bigint' })
  balanceBefore: number;

  @Column({ type: 'bigint' })
  balanceAfter: number;




  @Index({ unique: true })
  @Column()
  referenceId: string;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}