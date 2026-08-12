import { BaseEntity } from '@/base/entity.base';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { getRandomColor } from '@/utils/helper';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Player extends BaseEntity {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ example: 'a@example.com', nullable: true })
  @Prop({
    required: false,
    match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
    default: null,
    sparse: true,
  })
  email: string;

  @ApiProperty({ example: '0901234567', nullable: true })
  @Prop({ default: null })
  phone: string;

  @ApiProperty({ example: '#ef4444' })
  @Prop({ default: getRandomColor })
  color: string;

  @ApiProperty({ example: 600 })
  @Prop({ type: Number, default: 0 })
  totalPoints: number;

  @ApiProperty({ example: 3 })
  @Prop({ type: Number, default: 0 })
  bestLevel: number;

  @ApiProperty({ example: 5 })
  @Prop({ type: Number, default: 0 })
  gamesPlayed: number;

  @ApiProperty({ example: 3 })
  @Prop({ type: Number, default: 0 })
  gamesWon: number;
}

export const PlayerSchema = SchemaFactory.createForClass(Player);
