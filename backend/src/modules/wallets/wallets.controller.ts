import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { WalletTransactionDto } from '../transactions/dto/wallet-transaction.dto';
import { WalletResponseDto, TransactionResponseDto } from './dto/wallet-response.dto';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';

@ApiTags('wallets')
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new wallet for a user' })
  @ApiCreatedResponse({ type: WalletResponseDto })
  create(@Body() createWalletDto: CreateWalletDto) {
    return this.walletsService.create(createWalletDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all wallets' })
  @ApiOkResponse({ type: [WalletResponseDto] })
  findAll() {
    return this.walletsService.findAll();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get aggregate stats across all wallets (used by dashboard)' })
  stats() {
    return this.walletsService.getStats();
  }

  @Get('all/transactions')
  @ApiOperation({ summary: 'Get all transactions across all wallets (used by dashboard)' })
  @ApiOkResponse({ type: [TransactionResponseDto] })
  allTransactions() {
    return this.walletsService.getAllTransactions();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wallet by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ type: WalletResponseDto })
  @ApiNotFoundResponse({ description: 'Wallet not found' })
  find(@Param('id', ParseUUIDPipe) id: string) {
    return this.walletsService.findById(id);
  }

  @Post(':id/credit')
  @ApiOperation({
    summary: 'Credit a wallet',
    description:
      'Adds funds to the wallet. Idempotent — same referenceId will return the original transaction without crediting again.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCreatedResponse({ type: TransactionResponseDto })
  @ApiBadRequestResponse({ description: 'Wallet is suspended or invalid amount' })
  @ApiNotFoundResponse({ description: 'Wallet not found' })
  @UseInterceptors(IdempotencyInterceptor)
  credit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WalletTransactionDto,
  ) {
    return this.walletsService.credit(id, dto.amount, dto.referenceId, dto.description);
  }

  @Post(':id/debit')
  @ApiOperation({
    summary: 'Debit a wallet',
    description:
      'Deducts funds from the wallet. Will fail if balance is insufficient. Idempotent — same referenceId is safe to retry.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiCreatedResponse({ type: TransactionResponseDto })
  @ApiBadRequestResponse({ description: 'Insufficient balance or wallet suspended' })
  @ApiNotFoundResponse({ description: 'Wallet not found' })
  @UseInterceptors(IdempotencyInterceptor)
  debit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WalletTransactionDto,
  ) {
    return this.walletsService.debit(id, dto.amount, dto.referenceId, dto.description);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get all transactions for a wallet (newest first)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ type: [TransactionResponseDto] })
  @ApiNotFoundResponse({ description: 'Wallet not found' })
  transactions(@Param('id', ParseUUIDPipe) id: string) {
    return this.walletsService.getTransactions(id);
  }
}