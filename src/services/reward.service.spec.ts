import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { RewardService } from '@/services/reward.service';
import { GiftInventory } from '@/models/entities/gift-inventory.entity';
import { RewardClaim } from '@/models/entities/reward-claim.entity';
import { INVENTORY_DEFAULT } from '@/utils/rewards';

const giftInventoryModel = () => ({
  countDocuments: jest.fn(),
  insertMany: jest.fn(),
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
});

const rewardClaimModel = () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
});

function chainableResolve(value: unknown) {
  return {
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

const inventoryRows = (partial: Record<string, number>) =>
  Object.entries({ ao: 0, tui: 0, odu: 0, gau: 0, ...partial }).map(
    ([key, count]) => ({ key, count }),
  );

const claimRow = (overrides: Record<string, unknown> = {}) => ({
  playerId: 'p1',
  foodClaimed: false,
  wheelPrizeLabel: null,
  wheelGift: null,
  chosenGift: null,
  ...overrides,
});

describe('RewardService', () => {
  let service: RewardService;
  let giftModel: ReturnType<typeof giftInventoryModel>;
  let claimModel: ReturnType<typeof rewardClaimModel>;

  beforeEach(async () => {
    giftModel = giftInventoryModel();
    claimModel = rewardClaimModel();

    // Default chainable resolves so un-mocked calls never break.
    giftModel.countDocuments.mockReturnValue(chainableResolve(0));
    giftModel.insertMany.mockResolvedValue([]);
    giftModel.find.mockReturnValue(chainableResolve([]));
    giftModel.findOneAndUpdate.mockReturnValue(chainableResolve(null));
    claimModel.findOne.mockReturnValue(chainableResolve(null));
    claimModel.findOneAndUpdate.mockReturnValue(chainableResolve(null));

    const moduleRef = await Test.createTestingModule({
      providers: [
        RewardService,
        { provide: getModelToken(GiftInventory.name), useValue: giftModel },
        { provide: getModelToken(RewardClaim.name), useValue: claimModel },
      ],
    }).compile();

    service = moduleRef.get(RewardService);
  });

  describe('onModuleInit', () => {
    it('seeds default inventory when the collection is empty', async () => {
      giftModel.countDocuments.mockReturnValue(chainableResolve(0));
      giftModel.insertMany.mockResolvedValue([]);

      await service.onModuleInit();

      expect(giftModel.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ key: 'ao', count: INVENTORY_DEFAULT.ao }),
          expect.objectContaining({ key: 'tui', count: INVENTORY_DEFAULT.tui }),
          expect.objectContaining({ key: 'odu', count: INVENTORY_DEFAULT.odu }),
          expect.objectContaining({ key: 'gau', count: INVENTORY_DEFAULT.gau }),
        ]),
      );
    });

    it('does not seed when inventory already exists', async () => {
      giftModel.countDocuments.mockReturnValue(chainableResolve(4));

      await service.onModuleInit();

      expect(giftModel.insertMany).not.toHaveBeenCalled();
    });
  });

  describe('getRewardState', () => {
    it('returns claim + inventory', async () => {
      claimModel.findOne.mockReturnValue(
        chainableResolve(
          claimRow({ wheelPrizeLabel: '👕 Áo', wheelGift: 'ao' }),
        ),
      );
      giftModel.find.mockReturnValue(
        chainableResolve(inventoryRows({ ao: 50 })),
      );

      const result = await service.getRewardState('p1');

      expect(result.claim).toEqual({
        foodClaimed: false,
        wheelPrizeLabel: '👕 Áo',
        wheelGift: 'ao',
        chosenGift: null,
      });
      expect(result.inventory).toEqual({ ao: 50, tui: 0, odu: 0, gau: 0 });
    });

    it('throws BadRequestException for missing userId', async () => {
      await expect(service.getRewardState('')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAdminInventory', () => {
    it('computes odds + per-gift stats', async () => {
      giftModel.find.mockReturnValue(
        chainableResolve(inventoryRows({ ao: 40, tui: 30, odu: 20, gau: 10 })),
      );

      const result = await service.getAdminInventory();

      expect(result.inventory).toEqual({ ao: 40, tui: 30, odu: 20, gau: 10 });
      expect(result.gifts).toHaveLength(4);
      expect(result.gifts[0]).toMatchObject({ key: 'ao', stock: 40 });
      expect(result.gifts[3]).toMatchObject({ key: 'gau', stock: 10 });
      // Odds are weighted by remaining stock: stock[key] / totalStock.
      expect(result.odds.gifts.ao).toBeCloseTo(40 / 100, 5);
      expect(result.odds.gifts.tui).toBeCloseTo(30 / 100, 5);
      expect(result.odds.gifts.odu).toBeCloseTo(20 / 100, 5);
      expect(result.odds.gifts.gau).toBeCloseTo(10 / 100, 5);
      expect(result.odds.luck).toBe(0);
    });
  });

  describe('updateInventory', () => {
    it('upserts each gift count and returns admin view', async () => {
      giftModel.findOneAndUpdate.mockReturnValue(chainableResolve(null));
      giftModel.find.mockReturnValue(
        chainableResolve(inventoryRows({ ao: 7, tui: 8, odu: 9, gau: 10 })),
      );

      const result = await service.updateInventory({
        ao: 7,
        tui: 8,
        odu: 9,
        gau: 10,
      });

      expect(giftModel.findOneAndUpdate).toHaveBeenCalledTimes(4);
      expect(result.inventory.ao).toBe(7);
    });
  });

  describe('spin', () => {
    it('throws already-spun when a wheel prize already exists', async () => {
      claimModel.findOne.mockReturnValue(
        chainableResolve(claimRow({ wheelPrizeLabel: '👕 Áo' })),
      );

      await expect(service.spin('p1')).rejects.toThrow(ConflictException);
    });

    it('throws all-out-of-stock when total stock is zero', async () => {
      claimModel.findOne.mockReturnValue(chainableResolve(null));
      giftModel.find.mockReturnValue(chainableResolve(inventoryRows({})));

      await expect(service.spin('p1')).rejects.toThrow(ConflictException);
    });

    it('records a won gift and returns claim/index/inventory', async () => {
      claimModel.findOne
        .mockReturnValueOnce(chainableResolve(null))
        .mockReturnValueOnce(
          chainableResolve(
            claimRow({ wheelPrizeLabel: '👕 Áo', wheelGift: 'ao' }),
          ),
        );
      giftModel.find.mockReturnValue(
        chainableResolve(
          inventoryRows({ ao: 100, tui: 100, odu: 100, gau: 100 }),
        ),
      );
      giftModel.findOneAndUpdate.mockReturnValue(
        chainableResolve({ key: 'ao', count: 99 }),
      );
      claimModel.findOneAndUpdate.mockResolvedValue(claimRow());

      const result = await service.spin('p1');

      expect(result.index).toEqual(expect.any(Number));
      expect(result.claim.wheelPrizeLabel).toBeTruthy();
      expect(giftModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ count: { $gt: 0 } }),
        { $inc: { count: -1 } },
        expect.any(Object),
      );
    });

    it('retries a pick when the chosen gift is sold out, then awards an in-stock gift', async () => {
      claimModel.findOne
        .mockReturnValueOnce(chainableResolve(null))
        .mockReturnValueOnce(
          chainableResolve(
            claimRow({
              wheelPrizeLabel: '🍀 May mắn lần sau — nhận 🧸 Gấu bông',
              wheelGift: 'gau',
            }),
          ),
        );
      // The only in-stock gift (ao) sells out between read and decrement ->
      // decrement returns null -> re-read -> pick the remaining gift (gau).
      giftModel.find
        .mockReturnValueOnce(
          chainableResolve(inventoryRows({ ao: 1, tui: 0, odu: 0, gau: 0 })),
        )
        .mockReturnValueOnce(
          chainableResolve(inventoryRows({ ao: 0, tui: 0, odu: 0, gau: 1 })),
        );
      // First decrement (ao) fails; second decrement (gau) succeeds.
      giftModel.findOneAndUpdate
        .mockReturnValueOnce(chainableResolve(null))
        .mockReturnValueOnce(chainableResolve({ key: 'gau', count: 0 }));
      claimModel.findOneAndUpdate.mockResolvedValue(claimRow());

      const result = await service.spin('p1');

      expect(result.claim.wheelPrizeLabel).toBe(
        '🍀 May mắn lần sau — nhận 🧸 Gấu bông',
      );
      expect(result.claim.wheelGift).toBe('gau');
    });
  });

  describe('pick', () => {
    it('throws BadRequestException for an invalid gift', async () => {
      await expect(service.pick('p1', 'gau')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws spin-first when no wheel prize was won', async () => {
      claimModel.findOne.mockReturnValue(chainableResolve(claimRow()));

      await expect(service.pick('p1', 'ao')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws already-picked when chosenGift is set', async () => {
      claimModel.findOne.mockReturnValue(
        chainableResolve(
          claimRow({ wheelPrizeLabel: '👕 Áo', chosenGift: 'ao' }),
        ),
      );

      await expect(service.pick('p1', 'ao')).rejects.toThrow(ConflictException);
    });

    it('throws out-of-stock when decrement fails', async () => {
      claimModel.findOne.mockReturnValue(
        chainableResolve(claimRow({ wheelPrizeLabel: '👕 Áo' })),
      );
      giftModel.findOneAndUpdate.mockReturnValue(chainableResolve(null));

      await expect(service.pick('p1', 'ao')).rejects.toThrow(ConflictException);
    });

    it('records chosenGift and returns claim + inventory', async () => {
      claimModel.findOne
        .mockReturnValueOnce(
          chainableResolve(claimRow({ wheelPrizeLabel: '👕 Áo' })),
        )
        .mockReturnValueOnce(
          chainableResolve(
            claimRow({ wheelPrizeLabel: '👕 Áo', chosenGift: 'ao' }),
          ),
        );
      giftModel.findOneAndUpdate.mockReturnValue(
        chainableResolve({ key: 'ao', count: 99 }),
      );
      giftModel.find.mockReturnValue(
        chainableResolve(
          inventoryRows({ ao: 99, tui: 100, odu: 100, gau: 100 }),
        ),
      );

      const result = await service.pick('p1', 'ao');

      expect(result.claim.chosenGift).toBe('ao');
      expect(result.inventory.ao).toBe(99);
      expect(giftModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'ao', count: { $gt: 0 } },
        { $inc: { count: -1 } },
        expect.any(Object),
      );
    });
  });

  describe('claimFood', () => {
    it('upserts foodClaimed=true and returns the claim', async () => {
      claimModel.findOneAndUpdate.mockResolvedValue(claimRow());
      claimModel.findOne.mockReturnValue(
        chainableResolve(claimRow({ foodClaimed: true })),
      );

      const result = await service.claimFood('p1');

      expect(result.claim.foodClaimed).toBe(true);
      expect(claimModel.findOneAndUpdate).toHaveBeenCalledWith(
        { playerId: 'p1' },
        {
          $set: { foodClaimed: true },
          $setOnInsert: expect.any(Object),
        },
        { upsert: true, new: true },
      );
    });

    it('throws BadRequestException for missing playerId', async () => {
      await expect(service.claimFood('')).rejects.toThrow(BadRequestException);
    });
  });
});
