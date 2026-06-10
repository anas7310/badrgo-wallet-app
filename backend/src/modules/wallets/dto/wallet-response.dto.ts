import { ApiProperty } from '@nestjs/swagger';
import { WalletStatus } from '../../../common/enums/wallet-status.enum';
import { TransactionType } from '../../../common/enums/transaction-type.enum';

export class WalletResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() currency: string;
  @ApiProperty() balance: number;
  @ApiProperty({ enum: WalletStatus }) status: WalletStatus;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class TransactionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() walletId: string;
  @ApiProperty({ enum: TransactionType }) type: TransactionType;
  @ApiProperty() amount: number;
  @ApiProperty() balanceBefore: number;
  @ApiProperty() balanceAfter: number;
  @ApiProperty() referenceId: string;
  @ApiProperty({ required: false }) description?: string;
  @ApiProperty() createdAt: Date;
}
