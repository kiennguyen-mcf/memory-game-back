import { Player } from '@/models/entities/player.entity';
import { ApiProperty } from '@nestjs/swagger';

export class RewardTierStats {
  @ApiProperty({ example: 2 })
  set: number;

  @ApiProperty({ example: 3 })
  gift: number;

  @ApiProperty({ example: 5 })
  draw: number;
}

export class LevelStats {
  @ApiProperty({ example: 1 })
  level: number;

  @ApiProperty({ example: 10 })
  sessions: number;

  @ApiProperty({ example: 6 })
  wins: number;
}

export class StatsOverviewResponse {
  @ApiProperty({ example: 10 })
  totalPlayers: number;

  @ApiProperty({ example: 24 })
  totalSessions: number;

  @ApiProperty({ example: 16 })
  totalWins: number;

  @ApiProperty({ example: 1800 })
  totalPlayTimeSeconds: number;

  @ApiProperty({ example: 75 })
  averagePlayTimeSeconds: number;

  @ApiProperty({ type: RewardTierStats })
  rewards: RewardTierStats;

  @ApiProperty({ type: LevelStats, isArray: true })
  levels: LevelStats[];

  @ApiProperty({
    type: Player,
    isArray: true,
    description:
      'Danh sách người chơi kèm thông tin đầy đủ (tên, email, sđt, điểm...)',
  })
  players: Player[];
}
