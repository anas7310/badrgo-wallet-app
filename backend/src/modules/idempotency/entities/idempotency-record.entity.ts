import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum IdempotencyStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

@Entity('idempotency_record')
export class IdempotencyRecord {
  @PrimaryColumn()
  idempotencyKey: string;

  @Column({
    type: 'enum',
    enum: IdempotencyStatus,
    default: IdempotencyStatus.IN_PROGRESS,
  })
  status: IdempotencyStatus;

  @Column({ type: 'int', nullable: true })
  responseCode: number;

  @Column({ type: 'jsonb', nullable: true })
  responseBody: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
