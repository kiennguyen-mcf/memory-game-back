import { BaseRepositoryAbstract } from '@/base/abstract-repository.base';
import { BaseRepositoryInterface } from '@/base/repository.base';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { GameSession } from '../entities/game-session.entity';

@Injectable()
export class GameSessionsRepository
  extends BaseRepositoryAbstract<GameSession>
  implements BaseRepositoryInterface<GameSession>
{
  constructor(
    @InjectModel(GameSession.name)
    private readonly game_sessions_repository: Model<GameSession>,
  ) {
    super(game_sessions_repository);
  }

  findByPlayer(playerId: string, skip: number, limit: number) {
    return this.game_sessions_repository
      .find({ playerId, deleted_at: null })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
  }

  countByPlayer(filter: QueryFilter<GameSession>) {
    return this.game_sessions_repository.countDocuments(filter);
  }
}
