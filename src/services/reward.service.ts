import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GiftInventory } from '@/models/entities/gift-inventory.entity';
import { RewardClaim } from '@/models/entities/reward-claim.entity';
import { WheelConfig } from '@/models/entities/wheel-config.entity';
import { InventoryUpdate } from '@/models/requests/update-inventory.request';
import { UpdateWheelConfigRequest } from '@/models/requests/update-wheel-config.request';
import {
  GIFTS,
  GIFT_KEYS,
  INVENTORY_DEFAULT,
  LUCK_LABEL,
  WHEEL_CONFIG_DEFAULT,
  computeWheelOdds,
  pickWheelResult,
  totalStock,
  type GiftInventory as GiftInventoryRecord,
  type GiftKey,
  type WheelConfig as WheelConfigRecord,
  type WheelGift,
} from '@/utils/rewards';
import {
  AdminInventoryResponse,
  GauResponse,
  RewardStateResponse,
  SpinResponse,
} from '@/models/responses/reward-state.response';
import { RewardClaimResponse } from '@/models/responses/reward-claim.response';

@Injectable()
export class RewardService implements OnModuleInit {
  constructor(
    @InjectModel(GiftInventory.name)
    private readonly giftInventoryModel: Model<GiftInventory>,
    @InjectModel(RewardClaim.name)
    private readonly rewardClaimModel: Model<RewardClaim>,
    @InjectModel(WheelConfig.name)
    private readonly wheelConfigModel: Model<WheelConfig>,
  ) {}

  async onModuleInit(): Promise<void> {
    // Seed default inventory (odu/gau/v10/v15/v20) when empty.
    const count = await this.giftInventoryModel.countDocuments().exec();
    if (count > 0) return;
    await this.giftInventoryModel.insertMany(
      GIFT_KEYS.map((key) => ({ key, count: INVENTORY_DEFAULT[key] })),
    );
  }

  private async loadWheelConfig(): Promise<WheelConfigRecord> {
    const row = await this.wheelConfigModel.findOne({ key: 'default' }).lean().exec();
    if (!row) return { ...WHEEL_CONFIG_DEFAULT };
    return {
      odu: row.odu,
      gau: row.gau,
      v10: row.v10,
      v15: row.v15,
      v20: row.v20,
    };
  }

  private toClaimView(row: RewardClaim | null): RewardClaimResponse | null {
    if (!row) return null;
    return {
      foodClaimed: row.foodClaimed ?? false,
      wheelPrizeLabel: row.wheelPrizeLabel ?? null,
      wheelGift: (row.wheelGift as WheelGift) ?? null,
      gauGranted: row.gauGranted ?? false,
    };
  }

  private async loadInventory(): Promise<GiftInventoryRecord> {
    const rows = await this.giftInventoryModel.find().lean().exec();
    const inventory: GiftInventoryRecord = { odu: 0, gau: 0, v10: 0, v15: 0, v20: 0 };
    for (const row of rows) {
      if (GIFT_KEYS.includes(row.key as GiftKey)) {
        inventory[row.key as GiftKey] = row.count;
      }
    }
    return inventory;
  }

  async getRewardState(playerId: string): Promise<RewardStateResponse> {
    if (!playerId) {
      throw new BadRequestException({ error: 'Missing userId' });
    }
    const [claim, inventory, wheelConfig] = await Promise.all([
      this.rewardClaimModel.findOne({ playerId }).lean().exec(),
      this.loadInventory(),
      this.loadWheelConfig(),
    ]);
    return { claim: this.toClaimView(claim), inventory, wheelConfig };
  }

  async getAdminInventory(): Promise<AdminInventoryResponse> {
    const [inventory, wheelConfig] = await Promise.all([
      this.loadInventory(),
      this.loadWheelConfig(),
    ]);
    const odds = computeWheelOdds(inventory, wheelConfig);
    return {
      inventory,
      odds,
      wheelConfig,
      gifts: GIFT_KEYS.map((key) => ({
        key,
        name: GIFTS[key].name,
        icon: GIFTS[key].icon,
        stock: inventory[key],
        probability: odds.gifts[key],
      })),
    };
  }

  async updateInventory(
    update: InventoryUpdate,
  ): Promise<AdminInventoryResponse> {
    for (const key of GIFT_KEYS) {
      await this.giftInventoryModel
        .findOneAndUpdate(
          { key },
          { $set: { count: update[key] } },
          { upsert: true, new: true },
        )
        .lean()
        .exec();
    }
    return this.getAdminInventory();
  }

  async updateWheelConfig(
    dto: UpdateWheelConfigRequest,
  ): Promise<AdminInventoryResponse> {
    const patch: Partial<Record<GiftKey, number>> = {};
    for (const key of GIFT_KEYS) {
      if (dto[key] !== undefined) patch[key] = dto[key];
    }
    if (Object.keys(patch).length > 0) {
      await this.wheelConfigModel
        .findOneAndUpdate(
          { key: 'default' },
          { $set: { ...patch } },
          { upsert: true, new: true },
        )
        .lean()
        .exec();
    }
    return this.getAdminInventory();
  }

  async spin(playerId: string): Promise<SpinResponse> {
    if (!playerId) {
      throw new BadRequestException({ error: 'Missing playerId' });
    }

    const existing = await this.rewardClaimModel
      .findOne({ playerId })
      .lean()
      .exec();
    if (existing?.wheelPrizeLabel) {
      throw new ConflictException({
        error: 'already-spun',
        claim: this.toClaimView(existing),
      });
    }

    // Re-read stock on each attempt so a concurrent decrement (sold out between
    // read and write) is retried with up-to-date probabilities.
    let stock = await this.loadInventory();
    if (totalStock(stock) <= 0) {
      throw new ConflictException({ error: 'all-out-of-stock' });
    }
    const wheelConfig = await this.loadWheelConfig();

    let index: number | null = null;
    let gift: GiftKey | null = null;
    let luck = false;

    for (let attempt = 0; attempt < 5 && index === null; attempt++) {
      const pick = pickWheelResult(stock, wheelConfig);

      if (pick.gift === null) {
        index = pick.index;
        luck = true;
        break;
      }

      const decremented = await this.giftInventoryModel
        .findOneAndUpdate(
          { key: pick.gift, count: { $gt: 0 } },
          { $inc: { count: -1 } },
          { new: true },
        )
        .lean()
        .exec();

      if (decremented) {
        index = pick.index;
        gift = pick.gift;
      } else {
        stock = await this.loadInventory();
      }
    }

    if (index === null) {
      throw new ConflictException({ error: 'all-out-of-stock' });
    }

    const prizeLabel = luck
      ? LUCK_LABEL
      : gift === 'gau'
        ? '🍀 May mắn lần sau — nhận 🧸 Gấu bông'
        : `${GIFTS[gift as GiftKey].icon} ${GIFTS[gift as GiftKey].name}`;
    const storedGift: WheelGift | null = luck ? 'unlucky' : gift;

    await this.rewardClaimModel.findOneAndUpdate(
      { playerId },
      {
        $set: { wheelPrizeLabel: prizeLabel, wheelGift: storedGift },
        $setOnInsert: { playerId, foodClaimed: false, gauGranted: false },
      },
      { upsert: true, new: true },
    );

    const [claim, inventory] = await Promise.all([
      this.rewardClaimModel.findOne({ playerId }).lean().exec(),
      this.loadInventory(),
    ]);

    return {
      claim: this.toClaimView(claim),
      index,
      inventory,
      wheelConfig,
    };
  }

  // Grant the guaranteed Gấu bông for reaching 600 points. It is always granted
  // before the spin, and can only be granted once per player.
  async grantGau(playerId: string): Promise<GauResponse> {
    if (!playerId) {
      throw new BadRequestException({ error: 'Missing playerId' });
    }

    const existing = await this.rewardClaimModel
      .findOne({ playerId })
      .lean()
      .exec();
    if (existing?.gauGranted) {
      throw new ConflictException({
        error: 'already-granted',
        claim: this.toClaimView(existing),
      });
    }

    const decremented = await this.giftInventoryModel
      .findOneAndUpdate(
        { key: 'gau', count: { $gt: 0 } },
        { $inc: { count: -1 } },
        { new: true },
      )
      .lean()
      .exec();

    if (!decremented) {
      throw new ConflictException({ error: 'out-of-stock' });
    }

    await this.rewardClaimModel
      .findOneAndUpdate(
        { playerId },
        {
          $set: { gauGranted: true },
          $setOnInsert: {
            playerId,
            foodClaimed: false,
            wheelPrizeLabel: null,
            wheelGift: null,
          },
        },
        { upsert: true, new: true },
      )
      .lean()
      .exec();

    const [claim, inventory, wheelConfig] = await Promise.all([
      this.rewardClaimModel.findOne({ playerId }).lean().exec(),
      this.loadInventory(),
      this.loadWheelConfig(),
    ]);

    return {
      claim: this.toClaimView(claim),
      inventory,
      wheelConfig,
    };
  }

  async claimFood(playerId: string): Promise<{ claim: RewardClaimResponse }> {
    if (!playerId) {
      throw new BadRequestException({ error: 'Missing playerId' });
    }

    await this.rewardClaimModel.findOneAndUpdate(
      { playerId },
      {
        $set: { foodClaimed: true },
        $setOnInsert: {
          playerId,
          wheelPrizeLabel: null,
          wheelGift: null,
          gauGranted: false,
        },
      },
      { upsert: true, new: true },
    );

    const claim = await this.rewardClaimModel
      .findOne({ playerId })
      .lean()
      .exec();
    return { claim: this.toClaimView(claim) };
  }
}
