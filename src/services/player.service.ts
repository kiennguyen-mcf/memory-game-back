import { BaseServiceAbstract } from '@/base/abstract-service.base';
import { ErrorDictionary } from '@/enums/error-dictionary.enum';
import { SessionStatus } from '@/enums/session-status.enum';
import { GameSession } from '@/models/entities/game-session.entity';
import { Player } from '@/models/entities/player.entity';
import { CreatePlayerRequest } from '@/models/requests/create-player.request';
import { LoginPlayerRequest } from '@/models/requests/login-player.request';
import { LoginPlayerResponse } from '@/models/responses/login-player.response';
import { PlayersRepository } from '@/models/repos/player.repo';
import { GAME_TOTAL_LEVELS } from '@/utils/constants';
import { getRandomColor } from '@/utils/helper';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { omit } from 'lodash';
import { Model, Types } from 'mongoose';

@Injectable()
export class PlayerService extends BaseServiceAbstract<Player> {
  constructor(
    private readonly players_repository: PlayersRepository,
    @InjectModel(Player.name)
    private readonly player_model: Model<Player>,
    @InjectModel(GameSession.name)
    private readonly game_session_model: Model<GameSession>,
  ) {
    super(players_repository);
  }

  async createPlayer(dto: CreatePlayerRequest): Promise<{ userId: string }> {
    if (dto.email) {
      const emailExists = await this.players_repository.isTakenEmail(dto.email);
      if (emailExists) {
        throw new ConflictException(ErrorDictionary.PLAYER_EMAIL_TAKEN);
      }
    }

    if (dto.phone) {
      const phoneExists = await this.players_repository.isTakenPhone(dto.phone);
      if (phoneExists) {
        throw new ConflictException(ErrorDictionary.PLAYER_PHONE_TAKEN);
      }
    }

    const player = await this.players_repository.create({
      ...dto,
      color: getRandomColor(),
    });

    return { userId: player._id.toString() };
  }

  async login(dto: LoginPlayerRequest): Promise<LoginPlayerResponse> {
    const player = await this.player_model
      .findOne({ email: dto.email, phone: dto.phone, deleted_at: null })
      .lean()
      .exec();

    if (!player) {
      throw new NotFoundException(ErrorDictionary.PLAYER_NOT_FOUND);
    }

    const bestLevel = player.bestLevel ?? 0;
    let canContinue = false;
    let nextLevel: number | null = null;

    // A run is over once the player lost a level or beat all levels.
    // Continue only if the player won up to some level and has never
    // attempted (lost) the next one yet.
    if (bestLevel > 0 && bestLevel < GAME_TOTAL_LEVELS) {
      const lostAtNextLevel = await this.game_session_model.exists({
        playerId: player._id as Types.ObjectId,
        level: bestLevel + 1,
        status: SessionStatus.LOST,
      });
      if (!lostAtNextLevel) {
        canContinue = true;
        nextLevel = bestLevel + 1;
      }
    }

    return {
      userId: player._id.toString(),
      name: player.name,
      email: player.email,
      phone: player.phone,
      totalPoints: player.totalPoints,
      bestLevel,
      gamesPlayed: player.gamesPlayed,
      gamesWon: player.gamesWon,
      canContinue,
      nextLevel,
    };
  }

  async getPlayerById(id: string): Promise<Partial<Player>> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(ErrorDictionary.INVALID_PLAYER_ID);
    }

    const player = await this.player_model.findById(id).lean().exec();
    if (!player) {
      throw new NotFoundException(ErrorDictionary.PLAYER_NOT_FOUND);
    }

    return omit({ ...player, id: player._id.toString() }, '_id', '__v');
  }

  async getAllPlayers(
    page = 1,
    limit = 10,
  ): Promise<{ count: number; items: Partial<Player>[] }> {
    const skip = (page - 1) * limit;
    const { count, items } = await this.findAll(
      {},
      { sort: { totalPoints: -1 }, skip, limit },
    );

    return {
      count,
      items: items.map((player) =>
        omit({ ...player, id: player._id.toString() }, '_id', '__v'),
      ),
    };
  }

  async getLeaderboard(limit = 10): Promise<Partial<Player>[]> {
    const players = await this.players_repository.findTopByPoints(limit);
    return players.map((player) =>
      omit({ ...player, id: player._id.toString() }, '_id', '__v'),
    );
  }
}
