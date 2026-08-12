import { BaseRepositoryAbstract } from '@/base/abstract-repository.base';
import { BaseRepositoryInterface } from '@/base/repository.base';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { Player } from '../entities/player.entity';

@Injectable()
export class PlayersRepository
  extends BaseRepositoryAbstract<Player>
  implements BaseRepositoryInterface<Player>
{
  constructor(
    @InjectModel(Player.name)
    private readonly players_repository: Model<Player>,
  ) {
    super(players_repository);
  }

  isTakenEmail(email: string) {
    return this.players_repository.exists({ email });
  }

  isTakenPhone(phone: string) {
    return this.players_repository.exists({ phone });
  }

  findTopByPoints(limit: number) {
    return this.players_repository
      .find({ deleted_at: null })
      .sort({ totalPoints: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  count(filter: QueryFilter<Player>) {
    return this.players_repository.countDocuments(filter);
  }
}
