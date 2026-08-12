import { GameSession } from '@/models/entities/game-session.entity';
import { Player } from '@/models/entities/player.entity';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class AdminResetService {
  constructor(
    @InjectModel(Player.name)
    private readonly player_model: Model<Player>,
    @InjectModel(GameSession.name)
    private readonly game_session_model: Model<GameSession>,
  ) {}

  async resetDatabase(): Promise<{
    playersDeleted: number;
    sessionsDeleted: number;
    timestamp: string;
  }> {
    const [playersDeleted, sessionsDeleted] = await Promise.all([
      this.player_model.deleteMany({}).exec(),
      this.game_session_model.deleteMany({}).exec(),
    ]);

    return {
      playersDeleted: playersDeleted.deletedCount ?? 0,
      sessionsDeleted: sessionsDeleted.deletedCount ?? 0,
      timestamp: new Date().toISOString(),
    };
  }
}
