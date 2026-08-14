import { ApiProperty } from '@nestjs/swagger';
import type { GiftInventory, GiftKey } from '@/utils/rewards';
import { RewardClaimResponse } from './reward-claim.response';

export class InventoryResponse {
  @ApiProperty({ example: 60 })
  odu: number;

  @ApiProperty({ example: 108 })
  gau: number;

  @ApiProperty({ example: 100 })
  v10: number;

  @ApiProperty({ example: 100 })
  v15: number;

  @ApiProperty({ example: 100 })
  v20: number;
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

export class GauResponse {
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
  @ApiProperty({ example: 'odu', enum: ['odu', 'gau', 'v10', 'v15', 'v20'] })
  key: GiftKey;

  @ApiProperty({ example: 'Ô dù' })
  name: string;

  @ApiProperty({ example: '☂️' })
  icon: string;

  @ApiProperty({ example: 60 })
  stock: number;

  @ApiProperty({ example: 0.2 })
  probability: number;
}

export class AdminInventoryResponse {
  @ApiProperty({ type: InventoryResponse })
  inventory: GiftInventory;

  @ApiProperty({
    example: {
      luck: 0,
      gifts: { odu: 0.13, gau: 0.23, v10: 0.21, v15: 0.21, v20: 0.21 },
    },
  })
  odds: {
    luck: number;
    gifts: Record<GiftKey, number>;
  };

  @ApiProperty({ type: AdminGiftStatResponse, isArray: true })
  gifts: AdminGiftStatResponse[];
}
