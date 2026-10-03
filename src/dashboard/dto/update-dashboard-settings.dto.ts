import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDashboardSettingsDto {
  @ApiPropertyOptional({ nullable: true, description: 'ISO date-time, or null to clear maintenance schedule' })
  @IsOptional()
  @IsDateString()
  maintenanceScheduledAt?: string | null;

  @ApiPropertyOptional({ minimum: 50, maximum: 99 })
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(99)
  runtimeMemoryAlertThreshold?: number;
}
