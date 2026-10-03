import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransactionStatus } from '@prisma/client';

export class UpdateTransactionStatusDto {
  @ApiProperty({ enum: TransactionStatus })
  @IsNotEmpty()
  @IsEnum(TransactionStatus)
  status!: TransactionStatus;
}
