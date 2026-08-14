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
  Object.entries({ odu: 0, gau: 0, v10: 0, v15: 0, v20: 0, ...partial }).map(
    ([key, count]) => ({ key, count }),
  );

const claimRow = (overrides: Record<string, unknown> = {}) => ({
  playerId: 'p1',
  foodClaimed: false,
  wheelPrizeLabel: null,
  wheelGift: null,
  gauGranted: false,
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
          expect.objectContaining({ key: 'odu', count: INVENTORY_DEFAULT.odu }),
          expect.objectContaining({ key: 'gau', count: INVENTORY_DEFAULT.gau }),
          expect.objectContaining({ key: 'v10', count: INVENTORY_DEFAULT.v10 }),
          expect.objectContaining({ key: 'v15', count: INVENTORY_DEFAULT.v15 }),
          expect.objectContaining({ key: 'v20', count: INVENTORY_DEFAULT.v20 }),
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
          claimRow({ wheelPrizeLabel: '🎟️ Voucher giảm 10%', wheelGift: 'v10' }),
        ),
      );
      giftModel.find.mockReturnValue(
        chainableResolve(inventoryRows({ odu: 50 })),
      );

      const result = await service.getRewardState('p1');

      expect(result.claim).toEqual({
        foodClaimed: false,
        wheelPrizeLabel: '🎟️ Voucher giảm 10%',
        wheelGift: 'v10',
        gauGranted: false,
      });
      expect(result.inventory).toEqual({
        odu: 50,
        gau: 0,
        v10: 0,
        v15: 0,
        v20: 0,
      });
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
        chainableResolve(
          inventoryRows({ odu: 60, gau: 108, v10: 100, v15: 100, v20: 100 }),
        ),
      );

      const result = await service.getAdminInventory();

      expect(result.inventory).toEqual({
        odu: 60,
        gau: 108,
        v10: 100,
        v15: 100,
        v20: 100,
      });
      expect(result.gifts).toHaveLength(5);
      expect(result.gifts[0]).toMatchObject({ key: 'odu', stock: 60 });
      expect(result.gifts[4]).toMatchObject({ key: 'v20', stock: 100 });
      // Odds are weighted by remaining stock: stock[key] / totalStock.
      expect(result.odds.gifts.odu).toBeCloseTo(60 / 468, 5);
      expect(result.odds.gifts.gau).toBeCloseTo(108 / 468, 5);
      expect(result.odds.gifts.v10).toBeCloseTo(100 / 468, 5);
      expect(result.odds.gifts.v15).toBeCloseTo(100 / 468, 5);
      expect(result.odds.gifts.v20).toBeCloseTo(100 / 468, 5);
      expect(result.odds.luck).toBe(0);
    });
  });

  describe('updateInventory', () => {
    it('upserts each gift count and returns admin view', async () => {
      giftModel.findOneAndUpdate.mockReturnValue(chainableResolve(null));
      giftModel.find.mockReturnValue(
        chainableResolve(
          inventoryRows({ odu: 7, gau: 8, v10: 9, v15: 10, v20: 11 }),
        ),
      );

      const result = await service.updateInventory({
        odu: 7,
        gau: 8,
        v10: 9,
        v15: 10,
        v20: 11,
      });

      expect(giftModel.findOneAndUpdate).toHaveBeenCalledTimes(5);
      expect(result.inventory.odu).toBe(7);
    });
  });

  describe('spin', () => {
    it('throws already-spun when a wheel prize already exists', async () => {
      claimModel.findOne.mockReturnValue(
        chainableResolve(claimRow({ wheelPrizeLabel: '🎟️ Voucher giảm 10%' })),
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
            claimRow({
              wheelPrizeLabel: '🎟️ Voucher giảm 10%',
              wheelGift: 'v10',
            }),
          ),
        );
      giftModel.find.mockReturnValue(
        chainableResolve(
          inventoryRows({ odu: 60, gau: 108, v10: 100, v15: 100, v20: 100 }),
        ),
      );
      giftModel.findOneAndUpdate.mockReturnValue(
        chainableResolve({ key: 'v10', count: 99 }),
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
      // The only in-stock gift (odu) sells out between read and decrement ->
      // decrement returns null -> re-read -> pick the remaining gift (gau).
      giftModel.find
        .mockReturnValueOnce(
          chainableResolve(
            inventoryRows({ odu: 1, gau: 0, v10: 0, v15: 0, v20: 0 }),
          ),
        )
        .mockReturnValueOnce(
          chainableResolve(
            inventoryRows({ odu: 0, gau: 1, v10: 0, v15: 0, v20: 0 }),
          ),
        );
      // First decrement (odu) fails; second decrement (gau) succeeds.
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

  describe('grantGau', () => {
    it('throws already-granted when gau was already granted', async () => {
      claimModel.findOne.mockReturnValue(
        chainableResolve(claimRow({ gauGranted: true })),
      );

      await expect(service.grantGau('p1')).rejects.toThrow(ConflictException);
    });

    it('throws out-of-stock when decrement fails', async () => {
      claimModel.findOne.mockReturnValue(chainableResolve(claimRow()));
      giftModel.findOneAndUpdate.mockReturnValue(chainableResolve(null));

      await expect(service.grantGau('p1')).rejects.toThrow(ConflictException);
    });

    it('grants one gau and records gauGranted on the claim', async () => {
      claimModel.findOne
        .mockReturnValueOnce(chainableResolve(claimRow()))
        .mockReturnValueOnce(
          chainableResolve(claimRow({ gauGranted: true })),
        );
      giftModel.findOneAndUpdate.mockReturnValue(
        chainableResolve({ key: 'gau', count: 107 }),
      );
      giftModel.find.mockReturnValue(
        chainableResolve(
          inventoryRows({ odu: 60, gau: 107, v10: 100, v15: 100, v20: 100 }),
        ),
      );

      const result = await service.grantGau('p1');

      expect(result.claim.gauGranted).toBe(true);
      expect(result.inventory.gau).toBe(107);
      expect(giftModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'gau', count: { $gt: 0 } },
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
