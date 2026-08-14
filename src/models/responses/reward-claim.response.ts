import { ApiProperty } from '@nestjs/swagger';
import type { WheelGift } from '@/utils/rewards';

export class RewardClaimResponse {
  @ApiProperty({ example: false })
  foodClaimed: boolean;

  @ApiProperty({ example: '👕 Áo', nullable: true })
  wheelPrizeLabel: string | null;

  @ApiProperty({ example: 'v10', nullable: true })
  wheelGift: WheelGift | null;

  @ApiProperty({ example: false })
  gauGranted: boolean;
}
