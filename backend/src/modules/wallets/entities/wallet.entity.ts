import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { WalletStatus } from '../../../common/enums/wallet-status.enum';
import { Transaction } from '../../transactions/entities/transaction.entity';

@Entity()
@Index('idx_wallet_user_id', ['userId'])           
@Index('idx_wallet_status', ['status'])             
@Index('idx_wallet_user_status', ['userId', 'status']) 
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.wallets)
  user: User;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ type: 'bigint', default: 0 })
  balance: number; 

  @Column({
    type: 'enum',
    enum: WalletStatus,
    default: WalletStatus.ACTIVE,
  })
  status: WalletStatus;

  @OneToMany(() => Transaction, (tx: any) => tx.wallet)
  transactions: Transaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}