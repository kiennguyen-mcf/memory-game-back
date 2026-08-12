import { ErrorDictionary } from '@/enums/error-dictionary.enum';
import { SessionStatus } from '@/enums/session-status.enum';
import { GameSessionsRepository } from '@/models/repos/game-session.repo';
import { CacheDomain } from '@/services/cache.service';
import { GameSessionQueueService } from '@/services/game-session-queue.service';
import { GameSessionService } from '@/services/game-session.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';

describe('GameSessionService', () => {
  let service: GameSessionService;
  let gameSessionsRepository: {
    create: jest.Mock;
    countByPlayer: jest.Mock;
    findByPlayer: jest.Mock;
  };
  let cacheService: { withLockNoRetry: jest.Mock };
  let queueService: { publish: jest.Mock };
  let playerModel: { findById: jest.Mock; findByIdAndUpdate: jest.Mock };
  let gameSessionModel: { findById: jest.Mock };

  const validPlayerId = new Types.ObjectId().toString();
  const validSessionId = new Types.ObjectId().toString();

  beforeEach(async () => {
    gameSessionsRepository = {
      create: jest.fn(),
      countByPlayer: jest.fn(),
      findByPlayer: jest.fn(),
    };
    cacheService = { withLockNoRetry: jest.fn() };
    queueService = { publish: jest.fn().mockResolvedValue(undefined) };
    playerModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    gameSessionModel = { findById: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        GameSessionService,
        { provide: GameSessionsRepository, useValue: gameSessionsRepository },
        { provide: CacheDomain, useValue: cacheService },
        { provide: GameSessionQueueService, useValue: queueService },
        { provide: getModelToken('GameSession'), useValue: gameSessionModel },
        { provide: getModelToken('Player'), useValue: playerModel },
      ],
    }).compile();

    service = moduleRef.get(GameSessionService);
  });

  describe('createSession', () => {
    const baseDto = {
      playerId: validPlayerId,
      level: 2,
      score: 200,
      moves: 12,
      durationSeconds: 45,
      status: SessionStatus.WON as const,
    };

    function mockPlayerFound() {
      playerModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: validPlayerId }),
      });
    }

    it('should throw BadRequestException for invalid player id', async () => {
      await expect(
        service.createSession({ ...baseDto, playerId: 'bad-id' }),
      ).rejects.toThrow(
        new BadRequestException(ErrorDictionary.INVALID_PLAYER_ID),
      );
    });

    it('should throw NotFoundException when player does not exist', async () => {
      playerModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.createSession(baseDto)).rejects.toThrow(
        new NotFoundException(ErrorDictionary.PLAYER_NOT_FOUND),
      );
    });

    it('should create session and update stats on WON under lock', async () => {
      mockPlayerFound();
      gameSessionsRepository.create.mockResolvedValue({
        _id: new Types.ObjectId(validSessionId),
      });
      cacheService.withLockNoRetry.mockImplementation(
        async (_keys: string[], _ttl: number, fn: () => Promise<void>) => {
          await fn();
        },
      );
      playerModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.createSession(baseDto);

      expect(gameSessionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ level: 2, status: SessionStatus.WON }),
      );
      expect(cacheService.withLockNoRetry).toHaveBeenCalled();
      expect(playerModel.findByIdAndUpdate).toHaveBeenCalledWith(
        validPlayerId,
        expect.objectContaining({
          $inc: { totalPoints: 200, gamesWon: 1, gamesPlayed: 1 },
          $max: { bestLevel: 2 },
        }),
      );
      expect(queueService.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'game_session_created',
          sessionId: validSessionId,
          status: SessionStatus.WON,
        }),
      );
      expect(result._id.toString()).toBe(validSessionId);
    });

    it('should only increment gamesPlayed on LOST', async () => {
      mockPlayerFound();
      gameSessionsRepository.create.mockResolvedValue({
        _id: new Types.ObjectId(validSessionId),
      });
      cacheService.withLockNoRetry.mockImplementation(
        async (_keys: string[], _ttl: number, fn: () => Promise<void>) => {
          await fn();
        },
      );
      playerModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await service.createSession({ ...baseDto, status: SessionStatus.LOST });

      expect(playerModel.findByIdAndUpdate).toHaveBeenCalledWith(
        validPlayerId,
        { $inc: { gamesPlayed: 1 } },
      );
    });

    it('should update stats without lock when lock acquisition fails', async () => {
      mockPlayerFound();
      gameSessionsRepository.create.mockResolvedValue({
        _id: new Types.ObjectId(validSessionId),
      });
      cacheService.withLockNoRetry.mockRejectedValue(new Error('lock failed'));
      playerModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.createSession(baseDto);

      expect(playerModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
      expect(result._id.toString()).toBe(validSessionId);
    });

    it('should still create the session when queue publish fails', async () => {
      mockPlayerFound();
      gameSessionsRepository.create.mockResolvedValue({
        _id: new Types.ObjectId(validSessionId),
      });
      cacheService.withLockNoRetry.mockImplementation(
        async (_keys: string[], _ttl: number, fn: () => Promise<void>) => {
          await fn();
        },
      );
      playerModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      queueService.publish.mockRejectedValue(new Error('queue down'));

      const result = await service.createSession(baseDto);

      expect(result._id.toString()).toBe(validSessionId);
    });
  });

  describe('getSessionsByPlayer', () => {
    it('should throw BadRequestException for invalid player id', async () => {
      await expect(service.getSessionsByPlayer('bad-id')).rejects.toThrow(
        new BadRequestException(ErrorDictionary.INVALID_PLAYER_ID),
      );
    });

    it('should count and return player sessions mapped to public shape', async () => {
      gameSessionsRepository.countByPlayer.mockResolvedValue(1);
      gameSessionsRepository.findByPlayer.mockResolvedValue([
        { _id: new Types.ObjectId(validSessionId), level: 1, __v: 0 },
      ]);

      const result = await service.getSessionsByPlayer(validPlayerId, 1, 10);

      expect(gameSessionsRepository.findByPlayer).toHaveBeenCalledWith(
        validPlayerId,
        0,
        10,
      );
      expect(result.count).toBe(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({ id: validSessionId, level: 1 }),
      );
      expect(result.items[0]).not.toHaveProperty('_id');
    });
  });

  describe('getSessionById', () => {
    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.getSessionById('bad-id')).rejects.toThrow(
        new BadRequestException('Invalid session id'),
      );
    });

    it('should throw NotFoundException when session missing', async () => {
      gameSessionModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(null) }),
      });

      await expect(service.getSessionById(validSessionId)).rejects.toThrow(
        new NotFoundException(ErrorDictionary.SESSION_NOT_FOUND),
      );
    });

    it('should return session without internal fields', async () => {
      gameSessionModel.findById.mockReturnValue({
        lean: () => ({
          exec: jest.fn().mockResolvedValue({
            _id: new Types.ObjectId(validSessionId),
            level: 3,
            __v: 0,
          }),
        }),
      });

      const result = await service.getSessionById(validSessionId);

      expect(result).toEqual(
        expect.objectContaining({ id: validSessionId, level: 3 }),
      );
      expect(result).not.toHaveProperty('_id');
    });
  });
});
