import { PlayersRepository } from '@/models/repos/player.repo';
import { PlayerService } from '@/services/player.service';
import { GAME_TOTAL_LEVELS } from '@/utils/constants';
import { ErrorDictionary } from '@/enums/error-dictionary.enum';
import { SessionStatus } from '@/enums/session-status.enum';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';

describe('PlayerService', () => {
  let service: PlayerService;
  let playersRepository: {
    isTakenEmail: jest.Mock;
    isTakenPhone: jest.Mock;
    create: jest.Mock;
    findTopByPoints: jest.Mock;
    findAll: jest.Mock;
  };
  let playerModel: {
    findOne: jest.Mock;
    findById: jest.Mock;
  };
  let gameSessionModel: { exists: jest.Mock };

  const validId = new Types.ObjectId().toString();

  beforeEach(async () => {
    playersRepository = {
      isTakenEmail: jest.fn().mockResolvedValue(false),
      isTakenPhone: jest.fn().mockResolvedValue(false),
      create: jest.fn(),
      findTopByPoints: jest.fn(),
      findAll: jest.fn(),
    };

    playerModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
    };

    gameSessionModel = {
      exists: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PlayerService,
        { provide: PlayersRepository, useValue: playersRepository },
        { provide: getModelToken('Player'), useValue: playerModel },
        { provide: getModelToken('GameSession'), useValue: gameSessionModel },
      ],
    }).compile();

    service = moduleRef.get(PlayerService);
  });

  describe('createPlayer', () => {
    const baseDto = {
      name: 'Nguyễn Văn A',
      email: 'a@x.com',
      phone: '0901234567',
    };

    it('should create player with a random color when inputs are unique', async () => {
      playersRepository.create.mockResolvedValue({
        _id: new Types.ObjectId(validId),
      });

      const result = await service.createPlayer(baseDto);

      expect(playersRepository.isTakenEmail).toHaveBeenCalledWith(
        baseDto.email,
      );
      expect(playersRepository.isTakenPhone).toHaveBeenCalledWith(
        baseDto.phone,
      );
      expect(playersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...baseDto,
          color: expect.stringMatching(/^#[0-9a-f]{6}$/),
        }),
      );
      expect(result.userId).toBe(validId);
    });

    it('should throw ConflictException when email is taken', async () => {
      playersRepository.isTakenEmail.mockResolvedValue(true);

      await expect(service.createPlayer(baseDto)).rejects.toThrow(
        new ConflictException(ErrorDictionary.PLAYER_EMAIL_TAKEN),
      );
      expect(playersRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when phone is taken', async () => {
      playersRepository.isTakenPhone.mockResolvedValue(true);

      await expect(service.createPlayer(baseDto)).rejects.toThrow(
        new ConflictException(ErrorDictionary.PLAYER_PHONE_TAKEN),
      );
      expect(playersRepository.create).not.toHaveBeenCalled();
    });

    it('should skip uniqueness checks when email/phone are empty', async () => {
      playersRepository.create.mockResolvedValue({
        _id: new Types.ObjectId(validId),
      });

      await service.createPlayer({ name: 'A', email: '', phone: '' });

      expect(playersRepository.isTakenEmail).not.toHaveBeenCalled();
      expect(playersRepository.isTakenPhone).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = { email: 'a@x.com', phone: '0901234567' };

    function mockFoundPlayer(overrides: Record<string, unknown> = {}) {
      const player = {
        _id: new Types.ObjectId(validId),
        name: 'Nguyễn Văn A',
        email: 'a@x.com',
        phone: '0901234567',
        totalPoints: 300,
        bestLevel: 2,
        gamesPlayed: 5,
        gamesWon: 3,
        ...overrides,
      };
      playerModel.findOne.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(player) }),
      });
      return player;
    }

    it('should throw NotFoundException when player does not exist', async () => {
      playerModel.findOne.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(null) }),
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        new NotFoundException(ErrorDictionary.PLAYER_NOT_FOUND),
      );
    });

    it('should return no-continue when bestLevel is 0', async () => {
      mockFoundPlayer({ bestLevel: 0, totalPoints: 0 });

      const result = await service.login(loginDto);

      expect(result.canContinue).toBe(false);
      expect(result.nextLevel).toBeNull();
      expect(gameSessionModel.exists).not.toHaveBeenCalled();
    });

    it('should return no-continue when all levels are beaten', async () => {
      mockFoundPlayer({ bestLevel: GAME_TOTAL_LEVELS });

      const result = await service.login(loginDto);

      expect(result.canContinue).toBe(false);
      expect(result.nextLevel).toBeNull();
    });

    it('should allow continue to next level when won and next level never lost', async () => {
      mockFoundPlayer({ bestLevel: 2 });
      gameSessionModel.exists.mockResolvedValue(null);

      const result = await service.login(loginDto);

      expect(gameSessionModel.exists).toHaveBeenCalledWith(
        expect.objectContaining({ level: 3, status: SessionStatus.LOST }),
      );
      expect(result.canContinue).toBe(true);
      expect(result.nextLevel).toBe(3);
    });

    it('should not allow continue when next level was already lost', async () => {
      mockFoundPlayer({ bestLevel: 1 });
      gameSessionModel.exists.mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result.canContinue).toBe(false);
      expect(result.nextLevel).toBeNull();
    });

    it('should map player fields into the response', async () => {
      const player = mockFoundPlayer({ bestLevel: 1 });
      gameSessionModel.exists.mockResolvedValue(null);

      const result = await service.login(loginDto);

      expect(result.userId).toBe(validId);
      expect(result.name).toBe(player.name);
      expect(result.email).toBe(player.email);
      expect(result.phone).toBe(player.phone);
      expect(result.totalPoints).toBe(300);
      expect(result.bestLevel).toBe(1);
      expect(result.gamesPlayed).toBe(5);
      expect(result.gamesWon).toBe(3);
    });
  });

  describe('getPlayerById', () => {
    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.getPlayerById('not-an-object-id')).rejects.toThrow(
        new BadRequestException(ErrorDictionary.INVALID_PLAYER_ID),
      );
    });

    it('should throw NotFoundException when player missing', async () => {
      playerModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(null) }),
      });

      await expect(service.getPlayerById(validId)).rejects.toThrow(
        new NotFoundException(ErrorDictionary.PLAYER_NOT_FOUND),
      );
    });

    it('should return player without internal fields', async () => {
      const player = {
        _id: new Types.ObjectId(validId),
        name: 'A',
        __v: 0,
      };
      playerModel.findById.mockReturnValue({
        lean: () => ({ exec: jest.fn().mockResolvedValue(player) }),
      });

      const result = await service.getPlayerById(validId);

      expect(result).not.toHaveProperty('_id');
      expect(result).not.toHaveProperty('__v');
      expect(result.id).toBe(validId);
      expect(result.name).toBe('A');
    });
  });

  describe('getAllPlayers', () => {
    it('should paginate and map player documents', async () => {
      const items = [
        { _id: new Types.ObjectId(validId), name: 'A', __v: 0 },
        { _id: new Types.ObjectId(), name: 'B', __v: 0 },
      ];
      playersRepository.findAll.mockResolvedValue({ count: 2, items });

      const result = await service.getAllPlayers(2, 5);

      expect(playersRepository.findAll).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ skip: 5, limit: 5 }),
      );
      expect(result.count).toBe(2);
      expect(result.items[0]).toEqual(
        expect.objectContaining({ id: validId, name: 'A' }),
      );
      expect(result.items[0]).not.toHaveProperty('_id');
    });
  });

  describe('getLeaderboard', () => {
    it('should return top players mapped to public shape', async () => {
      const items = [{ _id: new Types.ObjectId(validId), name: 'Top', __v: 0 }];
      playersRepository.findTopByPoints.mockResolvedValue(items);

      const result = await service.getLeaderboard(5);

      expect(playersRepository.findTopByPoints).toHaveBeenCalledWith(5);
      expect(result[0]).toEqual(
        expect.objectContaining({ id: validId, name: 'Top' }),
      );
      expect(result[0]).not.toHaveProperty('__v');
    });
  });
});
