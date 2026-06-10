import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class WalletTransactionDto {
  @ApiProperty({
    example: 5000,
    description: 'Amount in cents (e.g. 5000 = $50.00). Must be a positive integer.',
  })
  @IsInt()
  @Min(1, { message: 'amount must be at least 1 cent' })
  amount: number;

  @ApiProperty({
    example: 'TXN-2024-001',
    description:
      'Unique reference ID for idempotency. The same referenceId will never be processed twice.',
  })
  @IsString()
  @IsNotEmpty()
  referenceId: string;

  @ApiPropertyOptional({
    example: 'Top-up from bank transfer',
    description: 'Optional human-readable description of the transaction',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
