import { BaseEntity } from '@/base/entity.base';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class WheelConfig extends BaseEntity {
  @ApiProperty({ example: 'default', description: 'Singleton key' })
  @Prop({ required: true, unique: true, default: 'default' })
  key: string;

  @ApiProperty({ example: 3 })
  @Prop({ required: true, min: 0 })
  odu: number;

  @ApiProperty({ example: 2 })
  @Prop({ required: true, min: 0 })
  gau: number;

  @ApiProperty({ example: 1 })
  @Prop({ required: true, min: 0 })
  v10: number;

  @ApiProperty({ example: 1 })
  @Prop({ required: true, min: 0 })
  v15: number;

  @ApiProperty({ example: 1 })
  @Prop({ required: true, min: 0 })
  v20: number;
}

export const WheelConfigSchema = SchemaFactory.createForClass(WheelConfig);
