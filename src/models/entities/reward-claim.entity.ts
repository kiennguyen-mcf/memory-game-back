import { BaseEntity } from '@/base/entity.base';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class RewardClaim extends BaseEntity {
  @ApiProperty({ example: '66f1a2b3c4d5e6f7a8b9c0d1' })
  @Prop({ required: true, unique: true })
  playerId: string;

  @ApiProperty({ example: false })
  @Prop({ type: Boolean, default: false })
  foodClaimed: boolean;

  @ApiProperty({ example: '👕 Áo', nullable: true })
  @Prop({ default: null })
  wheelPrizeLabel: string | null;

  @ApiProperty({ example: 'v10', nullable: true })
  @Prop({ default: null })
  wheelGift: string | null;

  @ApiProperty({ example: false })
  @Prop({ type: Boolean, default: false })
  gauGranted: boolean;
}

export const RewardClaimSchema = SchemaFactory.createForClass(RewardClaim);
