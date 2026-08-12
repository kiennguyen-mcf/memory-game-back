import { AdminResetService } from '@/services/admin-reset.service';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';

describe('AdminResetService', () => {
  let service: AdminResetService;
  let playerModel: { deleteMany: jest.Mock };
  let gameSessionModel: { deleteMany: jest.Mock };

  beforeEach(async () => {
    playerModel = {
      deleteMany: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      }),
    };
    gameSessionModel = {
      deleteMany: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminResetService,
        { provide: getModelToken('Player'), useValue: playerModel },
        { provide: getModelToken('GameSession'), useValue: gameSessionModel },
      ],
    }).compile();

    service = moduleRef.get(AdminResetService);
  });

  it('should delete all players and sessions and return counts', async () => {
    playerModel.deleteMany.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ deletedCount: 3 }),
    });
    gameSessionModel.deleteMany.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ deletedCount: 12 }),
    });
    const before = Date.now();

    const result = await service.resetDatabase();

    expect(playerModel.deleteMany).toHaveBeenCalledWith({});
    expect(gameSessionModel.deleteMany).toHaveBeenCalledWith({});
    expect(result.playersDeleted).toBe(3);
    expect(result.sessionsDeleted).toBe(12);
    expect(result.timestamp).toBeTruthy();
    expect(Date.parse(result.timestamp)).toBeGreaterThanOrEqual(before);
  });

  it('should default deleted counts to 0 when not returned', async () => {
    playerModel.deleteMany.mockReturnValue({
      exec: jest.fn().mockResolvedValue({}),
    });
    gameSessionModel.deleteMany.mockReturnValue({
      exec: jest.fn().mockResolvedValue({}),
    });

    const result = await service.resetDatabase();

    expect(result.playersDeleted).toBe(0);
    expect(result.sessionsDeleted).toBe(0);
  });
});
