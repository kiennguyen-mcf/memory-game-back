import { BaseEntity } from '@/base/entity.base';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class GiftInventory extends BaseEntity {
  @ApiProperty({ example: 'ao', enum: ['ao', 'tui', 'odu', 'gau'] })
  @Prop({ required: true, unique: true })
  key: string;

  @ApiProperty({ example: 100 })
  @Prop({ required: true, default: 100, min: 0 })
  count: number;
}

export const GiftInventorySchema = SchemaFactory.createForClass(GiftInventory);
