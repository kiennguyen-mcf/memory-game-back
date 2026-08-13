import { ApiProperty } from '@nestjs/swagger';
import type { GiftInventory, GiftKey } from '@/utils/rewards';
import { RewardClaimResponse } from './reward-claim.response';

export class InventoryResponse {
  @ApiProperty({ example: 100 })
  ao: number;

  @ApiProperty({ example: 100 })
  tui: number;

  @ApiProperty({ example: 100 })
  odu: number;

  @ApiProperty({ example: 100 })
  gau: number;
}

export class RewardStateResponse {
  @ApiProperty({ type: RewardClaimResponse, nullable: true })
  claim: RewardClaimResponse | null;

  @ApiProperty({ type: InventoryResponse })
  inventory: GiftInventory;
}

export class SpinResponse {
  @ApiProperty({ type: RewardClaimResponse })
  claim: RewardClaimResponse;

  @ApiProperty({ example: 3 })
  index: number;

  @ApiProperty({ type: InventoryResponse })
  inventory: GiftInventory;
}

export class PickResponse {
  @ApiProperty({ type: RewardClaimResponse })
  claim: RewardClaimResponse;

  @ApiProperty({ type: InventoryResponse })
  inventory: GiftInventory;
}

export class FoodResponse {
  @ApiProperty({ type: RewardClaimResponse })
  claim: RewardClaimResponse;
}

export class AdminGiftStatResponse {
  @ApiProperty({ example: 'ao', enum: ['ao', 'tui', 'odu', 'gau'] })
  key: GiftKey;

  @ApiProperty({ example: 'Áo' })
  name: string;

  @ApiProperty({ example: '👕' })
  icon: string;

  @ApiProperty({ example: 100 })
  stock: number;

  @ApiProperty({ example: 0.2 })
  probability: number;
}

export class AdminInventoryResponse {
  @ApiProperty({ type: InventoryResponse })
  inventory: GiftInventory;

  @ApiProperty({
    example: { luck: 0.4, gifts: { ao: 0.2, tui: 0.2, odu: 0.2, gau: 0 } },
  })
  odds: {
    luck: number;
    gifts: Record<GiftKey, number>;
  };

  @ApiProperty({ type: AdminGiftStatResponse, isArray: true })
  gifts: AdminGiftStatResponse[];
}
