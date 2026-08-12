import { BaseServiceAbstract } from '@/base/abstract-service.base';
import { ErrorDictionary } from '@/enums/error-dictionary.enum';
import { RedisKey } from '@/enums/redis-key.enum';
import { SessionStatus } from '@/enums/session-status.enum';
import { GameSession } from '@/models/entities/game-session.entity';
import { Player } from '@/models/entities/player.entity';
import { CreateSessionRequest } from '@/models/requests/create-session.request';
import { GameSessionsRepository } from '@/models/repos/game-session.repo';
import { toObjectId } from '@/utils/helper';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { omit } from 'lodash';
import { Model, Types } from 'mongoose';
import { CacheDomain } from './cache.service';
import { GameSessionQueueService } from './game-session-queue.service';

@Injectable()
export class GameSessionService extends BaseServiceAbstract<GameSession> {
  logger = new Logger(GameSessionService.name);

  constructor(
    private readonly game_sessions_repository: GameSessionsRepository,
    private readonly cacheService: CacheDomain,
    private readonly gameSessionQueueService: GameSessionQueueService,
    @InjectModel(GameSession.name)
    private readonly game_session_model: Model<GameSession>,
    @InjectModel(Player.name)
    private readonly player_model: Model<Player>,
  ) {
    super(game_sessions_repository);
  }

  async createSession(dto: CreateSessionRequest): Promise<GameSession> {
    if (!Types.ObjectId.isValid(dto.playerId)) {
      throw new BadRequestException(ErrorDictionary.INVALID_PLAYER_ID);
    }

    const player = await this.player_model.findById(dto.playerId).exec();
    if (!player) {
      throw new NotFoundException(ErrorDictionary.PLAYER_NOT_FOUND);
    }

    const session = await this.game_sessions_repository.create({
      playerId: toObjectId(dto.playerId),
      level: dto.level,
      score: dto.score ?? 0,
      moves: dto.moves ?? 0,
      durationSeconds: dto.durationSeconds ?? 0,
      status: dto.status,
      startedAt: new Date(),
      endedAt: new Date(),
    });

    const updatePlayerStats = async () => {
      if (dto.status === SessionStatus.WON) {
        await this.player_model
          .findByIdAndUpdate(dto.playerId, {
            $inc: { totalPoints: dto.score ?? 0, gamesWon: 1, gamesPlayed: 1 },
            $max: { bestLevel: dto.level },
          })
          .exec();
      } else {
        await this.player_model
          .findByIdAndUpdate(dto.playerId, { $inc: { gamesPlayed: 1 } })
          .exec();
      }
    };

    try {
      await this.cacheService.withLockNoRetry(
        [`${RedisKey.PLAYER_LOCKING}:${dto.playerId}`],
        5,
        updatePlayerStats,
      );
    } catch {
      this.logger.warn(
        `Cannot acquire lock for player ${dto.playerId}, updating without lock`,
      );
      await updatePlayerStats();
    }

    try {
      await this.gameSessionQueueService.publish({
        type: 'game_session_created',
        sessionId: session._id.toString(),
        playerId: dto.playerId,
        status: dto.status,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.warn(
        `Failed to enqueue session event: ${(err as Error).message}`,
      );
    }

    return session;
  }

  async getSessionsByPlayer(
    playerId: string,
    page = 1,
    limit = 10,
  ): Promise<{ count: number; items: Partial<GameSession>[] }> {
    if (!Types.ObjectId.isValid(playerId)) {
      throw new BadRequestException(ErrorDictionary.INVALID_PLAYER_ID);
    }

    const skip = (page - 1) * limit;
    const [count, items] = await Promise.all([
      this.game_sessions_repository.countByPlayer({ playerId }),
      this.game_sessions_repository.findByPlayer(playerId, skip, limit),
    ]);

    return {
      count,
      items: items.map((session) =>
        omit({ ...session, id: session._id.toString() }, '_id', '__v'),
      ),
    };
  }

  async getSessionById(id: string): Promise<Partial<GameSession>> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid session id');
    }

    const session = await this.game_session_model.findById(id).lean().exec();
    if (!session) {
      throw new NotFoundException(ErrorDictionary.SESSION_NOT_FOUND);
    }

    return omit({ ...session, id: session._id.toString() }, '_id', '__v');
  }
}
