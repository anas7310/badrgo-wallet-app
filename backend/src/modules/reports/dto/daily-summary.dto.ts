import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class DailySummaryQueryDto {
  @ApiPropertyOptional({
    example: '2024-06-10',
    description: 'Date to generate summary for (YYYY-MM-DD). Defaults to today.',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
