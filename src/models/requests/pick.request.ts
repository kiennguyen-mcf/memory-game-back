import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { WHEEL_GIFT_KEYS } from '@/utils/rewards';

export class PickRequest {
  @ApiProperty({ example: '66f1a2b3c4d5e6f7a8b9c0d1' })
  @IsString()
  @IsNotEmpty()
  playerId: string;

  @ApiProperty({ example: 'ao', enum: WHEEL_GIFT_KEYS })
  @IsString()
  @IsIn(WHEEL_GIFT_KEYS)
  gift: string;
}
