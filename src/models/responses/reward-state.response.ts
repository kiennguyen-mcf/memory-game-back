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

export class WheelConfigResponse {
  @ApiProperty({ example: 3 })
  odu: number;

  @ApiProperty({ example: 2 })
  gau: number;

  @ApiProperty({ example: 1 })
  v10: number;

  @ApiProperty({ example: 1 })
  v15: number;

  @ApiProperty({ example: 1 })
  v20: number;
}

export class RewardStateResponse {
  @ApiProperty({ type: RewardClaimResponse, nullable: true })
  claim: RewardClaimResponse | null;

  @ApiProperty({ type: InventoryResponse })
  inventory: GiftInventory;

  @ApiProperty({ type: WheelConfigResponse })
  wheelConfig: WheelConfigResponse;
}

export class SpinResponse {
  @ApiProperty({ type: RewardClaimResponse })
  claim: RewardClaimResponse;

  @ApiProperty({ example: 3 })
  index: number;

  @ApiProperty({ type: InventoryResponse })
  inventory: GiftInventory;

  @ApiProperty({ type: WheelConfigResponse })
  wheelConfig: WheelConfigResponse;
}

export class GauResponse {
  @ApiProperty({ type: RewardClaimResponse })
  claim: RewardClaimResponse;

  @ApiProperty({ type: InventoryResponse })
  inventory: GiftInventory;

  @ApiProperty({ type: WheelConfigResponse })
  wheelConfig: WheelConfigResponse;
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
      gifts: { odu: 0.375, gau: 0.25, v10: 0.125, v15: 0.125, v20: 0.125 },
    },
  })
  odds: {
    luck: number;
    gifts: Record<GiftKey, number>;
  };

  @ApiProperty({ type: AdminGiftStatResponse, isArray: true })
  gifts: AdminGiftStatResponse[];

  @ApiProperty({ type: WheelConfigResponse })
  wheelConfig: WheelConfigResponse;
}
