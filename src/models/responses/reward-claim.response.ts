import { ApiProperty } from '@nestjs/swagger';
import type { GiftKey, WheelGift } from '@/utils/rewards';

export class RewardClaimResponse {
  @ApiProperty({ example: false })
  foodClaimed: boolean;

  @ApiProperty({ example: '👕 Áo', nullable: true })
  wheelPrizeLabel: string | null;

  @ApiProperty({ example: 'ao', nullable: true })
  wheelGift: WheelGift | null;

  @ApiProperty({ example: 'ao', nullable: true })
  chosenGift: GiftKey | null;
}
