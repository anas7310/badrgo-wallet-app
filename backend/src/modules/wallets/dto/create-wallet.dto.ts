import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateWalletDto {
  @ApiProperty({ example: 'uuid-of-user', description: 'ID of the user who owns this wallet' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({ example: 'USD', default: 'USD', description: 'ISO 4217 currency code' })
  @IsOptional()
  @IsString()
  currency?: string;
}
