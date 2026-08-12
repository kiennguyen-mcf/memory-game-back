import { SessionStatus } from '@/enums/session-status.enum';
import { GameSession } from '@/models/entities/game-session.entity';
import { Player } from '@/models/entities/player.entity';
import {
  LevelStats,
  StatsOverviewResponse,
} from '@/models/responses/stats-overview.response';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(Player.name)
    private readonly player_model: Model<Player>,
    @InjectModel(GameSession.name)
    private readonly game_session_model: Model<GameSession>,
  ) {}

  async getOverview(): Promise<StatsOverviewResponse> {
    const [totalPlayers, sessionStats, rewardTiers, levelAgg, players] =
      await Promise.all([
        this.player_model.countDocuments({ deleted_at: null }),

        this.game_session_model
          .aggregate<{
            total: number;
            wins: number;
            playTime: number;
          }>([
            { $match: { deleted_at: null } },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                wins: {
                  $sum: {
                    $cond: [{ $eq: ['$status', SessionStatus.WON] }, 1, 0],
                  },
                },
                playTime: { $sum: '$durationSeconds' },
              },
            },
          ])
          .exec(),

        this.player_model
          .aggregate<{
            set: number;
            gift: number;
            draw: number;
          }>([
            { $match: { deleted_at: null } },
            {
              $group: {
                _id: null,
                set: {
                  $sum: { $cond: [{ $gte: ['$totalPoints', 600] }, 1, 0] },
                },
                gift: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gte: ['$totalPoints', 300] },
                          { $lt: ['$totalPoints', 600] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                draw: {
                  $sum: { $cond: [{ $lt: ['$totalPoints', 300] }, 1, 0] },
                },
              },
            },
          ])
          .exec(),

        this.game_session_model
          .aggregate<{
            _id: number;
            sessions: number;
            wins: number;
          }>([
            { $match: { deleted_at: null } },
            {
              $group: {
                _id: '$level',
                sessions: { $sum: 1 },
                wins: {
                  $sum: {
                    $cond: [{ $eq: ['$status', SessionStatus.WON] }, 1, 0],
                  },
                },
              },
            },
            { $sort: { _id: 1 } },
          ])
          .exec(),

        this.player_model
          .find({ deleted_at: null })
          .sort({ totalPoints: -1, created_at: 1 })
          .lean()
          .exec(),
      ]);

    const totals = sessionStats[0] ?? { total: 0, wins: 0, playTime: 0 };
    const tiers = rewardTiers[0] ?? { set: 0, gift: 0, draw: 0 };

    const levels: LevelStats[] = levelAgg.map((item) => ({
      level: item._id,
      sessions: item.sessions,
      wins: item.wins,
    }));

    return {
      totalPlayers,
      totalSessions: totals.total,
      totalWins: totals.wins,
      totalPlayTimeSeconds: totals.playTime,
      averagePlayTimeSeconds:
        totals.total > 0 ? Math.round(totals.playTime / totals.total) : 0,
      rewards: {
        set: tiers.set,
        gift: tiers.gift,
        draw: tiers.draw,
      },
      levels,
      players,
    };
  }
}
