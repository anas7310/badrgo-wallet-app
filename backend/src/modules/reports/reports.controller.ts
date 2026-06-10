import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { DailySummaryQueryDto } from './dto/daily-summary.dto';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-summary')
  @ApiOperation({
    summary: 'Get daily transaction summary',
    description:
      'Returns total credits, total debits, transaction count, and active wallets for a given date. Defaults to today if no date is provided.',
  })
  dailySummary(@Query() query: DailySummaryQueryDto) {
    const date = query.date ?? new Date().toISOString().split('T')[0];
    return this.reportsService.dailySummary(date);
  }
}
