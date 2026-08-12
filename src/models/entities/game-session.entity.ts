import { BaseEntity } from '@/base/entity.base';
import { SessionStatus } from '@/enums/session-status.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Player } from './player.entity';

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class GameSession extends BaseEntity {
  @ApiProperty({ example: '66f1a2b3c4d5e6f7a8b9c0d1' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Player', required: true })
  playerId: Types.ObjectId | Player;

  @ApiProperty({ example: 1 })
  @Prop({ type: Number, required: true })
  level: number;

  @ApiProperty({ example: 100 })
  @Prop({ type: Number, default: 0 })
  score: number;

  @ApiProperty({ example: 8 })
  @Prop({ type: Number, default: 0 })
  moves: number;

  @ApiProperty({ example: 45 })
  @Prop({ type: Number, default: 0 })
  durationSeconds: number;

  @ApiProperty({ enum: SessionStatus, example: SessionStatus.WON })
  @Prop({ type: String, enum: SessionStatus, required: true })
  status: SessionStatus;

  @ApiProperty({ example: '2026-08-04T03:20:31.000Z' })
  @Prop({ default: null })
  startedAt: Date;

  @ApiProperty({ example: '2026-08-04T03:20:31.000Z' })
  @Prop({ default: null })
  endedAt: Date;
}

export const GameSessionSchema = SchemaFactory.createForClass(GameSession);
