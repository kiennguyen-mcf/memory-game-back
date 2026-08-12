import { StatsService } from '@/services/stats.service';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';

describe('StatsService', () => {
  let service: StatsService;
  let playerModel: {
    countDocuments: jest.Mock;
    aggregate: jest.Mock;
    find: jest.Mock;
  };
  let gameSessionModel: {
    aggregate: jest.Mock;
  };

  beforeEach(async () => {
    playerModel = {
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
      find: jest.fn(),
    };
    gameSessionModel = { aggregate: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: getModelToken('Player'), useValue: playerModel },
        { provide: getModelToken('GameSession'), useValue: gameSessionModel },
      ],
    }).compile();

    service = moduleRef.get(StatsService);
  });

  it('should return an empty overview when no data exists', async () => {
    playerModel.countDocuments.mockResolvedValue(0);
    gameSessionModel.aggregate
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) });
    playerModel.aggregate.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue([]),
    });
    playerModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      }),
    });

    const result = await service.getOverview();

    expect(result).toEqual({
      totalPlayers: 0,
      totalSessions: 0,
      totalWins: 0,
      totalPlayTimeSeconds: 0,
      averagePlayTimeSeconds: 0,
      rewards: { set: 0, gift: 0, draw: 0 },
      levels: [],
      players: [],
    });
  });

  it('should aggregate session totals and reward tiers correctly', async () => {
    playerModel.countDocuments.mockResolvedValue(5);

    // game_session_model.aggregate: (1) session totals, (2) level breakdown
    gameSessionModel.aggregate
      .mockReturnValueOnce({
        exec: jest
          .fn()
          .mockResolvedValue([{ total: 10, wins: 7, playTime: 1500 }]),
      })
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([
          { _id: 1, sessions: 4, wins: 3 },
          { _id: 2, sessions: 6, wins: 4 },
        ]),
      });

    // player_model.aggregate: reward tiers
    playerModel.aggregate.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue([{ set: 1, gift: 2, draw: 2 }]),
    });

    playerModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      }),
    });

    const result = await service.getOverview();

    expect(result.totalPlayers).toBe(5);
    expect(result.totalSessions).toBe(10);
    expect(result.totalWins).toBe(7);
    expect(result.totalPlayTimeSeconds).toBe(1500);
    expect(result.averagePlayTimeSeconds).toBe(150);
    expect(result.rewards).toEqual({ set: 1, gift: 2, draw: 2 });
    expect(result.levels).toEqual([
      { level: 1, sessions: 4, wins: 3 },
      { level: 2, sessions: 6, wins: 4 },
    ]);
  });

  it('should include the full player list sorted by total points', async () => {
    playerModel.countDocuments.mockResolvedValue(2);
    gameSessionModel.aggregate
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) })
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue([]) });
    playerModel.aggregate.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue([]),
    });

    const players = [
      {
        _id: new Types.ObjectId(),
        name: 'Top Player',
        email: 'top@example.com',
        phone: '0901111111',
        totalPoints: 600,
        bestLevel: 3,
        gamesPlayed: 3,
        gamesWon: 3,
      },
      {
        _id: new Types.ObjectId(),
        name: 'Casual Player',
        email: null,
        phone: '0902222222',
        totalPoints: 100,
        bestLevel: 1,
        gamesPlayed: 1,
        gamesWon: 1,
      },
    ];
    playerModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest
          .fn()
          .mockReturnValue({ exec: jest.fn().mockResolvedValue(players) }),
      }),
    });

    const result = await service.getOverview();

    expect(playerModel.find).toHaveBeenCalledWith({ deleted_at: null });
    expect(result.players).toHaveLength(2);
    expect(result.players[0].name).toBe('Top Player');
    expect(result.players[1].phone).toBe('0902222222');
  });
});
