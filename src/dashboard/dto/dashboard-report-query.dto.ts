import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardReportQueryDto {
  @ApiPropertyOptional({ description: 'Inclusive start date (ISO date or date-time)' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Inclusive end date (ISO date or date-time)' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
