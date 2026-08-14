export type GiftKey = 'odu' | 'gau' | 'v10' | 'v15' | 'v20';

// Kept for backward compatibility with claims stored before the wheel redesign.
export type WheelGift = GiftKey | 'unlucky';

export type GiftInventory = Record<GiftKey, number>;

// Number of wheel segments per gift. A gift's chance of being won equals its
// segment count divided by the total in-stock segment count.
export type WheelConfig = Record<GiftKey, number>;

export interface Gift {
  key: WheelGift;
  name: string;
  icon: string;
}

export const GIFTS: Record<WheelGift, Gift> = {
  odu: { key: 'odu', name: 'Ô dù', icon: '☂️' },
  gau: { key: 'gau', name: 'Gấu bông', icon: '🧸' },
  v10: { key: 'v10', name: 'Voucher giảm 10%', icon: '🎫' },
  v15: { key: 'v15', name: 'Voucher giảm 15%', icon: '🎫' },
  v20: { key: 'v20', name: 'Voucher giảm 20%', icon: '🎫' },
  unlucky: { key: 'unlucky', name: 'Chúc bạn may mắn lần sau', icon: '🍀' },
};

export const GIFT_KEYS: GiftKey[] = ['odu', 'gau', 'v10', 'v15', 'v20'];

export interface WheelSegment {
  label: string;
  icon: string;
  gift: GiftKey | null;
}

export const LUCK_LABEL = '🍀 Chúc bạn may mắn lần sau!';

// Default wheel layout: 8 segments. Voucher 15% / 20% get 1 segment each so
// they are harder to win; Ô dù gets 3 and Gấu bông (luck) 2.
export const WHEEL_CONFIG_DEFAULT: WheelConfig = {
  odu: 3,
  gau: 2,
  v10: 1,
  v15: 1,
  v20: 1,
};

const SEGMENT_META: Record<GiftKey, { label: string; icon: string }> = {
  odu: { label: 'Ô dù', icon: '☂️' },
  gau: { label: 'Chúc bạn\nmay mắn lần sau', icon: '🍀' },
  v10: { label: 'Giảm 10%', icon: '🎫' },
  v15: { label: 'Giảm 15%', icon: '🎫' },
  v20: { label: 'Giảm 20%', icon: '🎫' },
};

// Build the wheel segments from a per-gift segment count. The most common gift
// is spread evenly first, then the rest are inserted into the largest empty gap
// so no two identical segments sit next to each other — including the wrap
// around the wheel. A "may mắn lần sau" (luck) segment is the visual for the
// Gấu bông (gau) and has gift: null.
export function buildWheelSegments(config: WheelConfig): WheelSegment[] {
  const counts = GIFT_KEYS.filter((key) => config[key] > 0).map((key) => ({
    meta: SEGMENT_META[key],
    key,
    count: config[key],
  }));

  const total = counts.reduce((sum, c) => sum + c.count, 0);
  if (total === 0) return [];

  const ordered = [...counts].sort((a, b) => b.count - a.count);
  const slots: (GiftKey | null)[] = new Array(total).fill(null);

  const first = ordered[0];
  for (let k = 0; k < first.count; k++) {
    slots[Math.round((k * total) / first.count) % total] = first.key;
  }

  const placed = slots
    .map((gift, index) => ({ gift, index }))
    .filter((s) => s.gift !== null)
    .map((s) => s.index);

  for (const item of ordered.slice(1)) {
    for (let unit = 0; unit < item.count; unit++) {
      const sorted = [...placed].sort((a, b) => a - b);
      let bestLen = -1;
      let bestMid = -1;
      for (let i = 0; i < sorted.length; i++) {
        const a = sorted[i];
        const b = sorted[(i + 1) % sorted.length];
        const len = (b - a - 1 + total) % total;
        if (len <= 0) continue;
        if (len > bestLen) {
          bestLen = len;
          bestMid = (a + 1 + Math.floor((len - 1) / 2)) % total;
        }
      }
      slots[bestMid] = item.key;
      placed.push(bestMid);
    }
  }

  return slots.map((gift) => ({
    label: SEGMENT_META[gift ?? 'gau'].label,
    icon: SEGMENT_META[gift ?? 'gau'].icon,
    gift: gift === 'gau' ? null : gift,
  }));
}

export const WHEEL_SEGMENTS: WheelSegment[] =
  buildWheelSegments(WHEEL_CONFIG_DEFAULT);

export const INVENTORY_DEFAULT: Record<GiftKey, number> = {
  odu: 60,
  gau: 108,
  v10: 100,
  v15: 100,
  v20: 100,
};

export function totalStock(stock: GiftInventory): number {
  return GIFT_KEYS.reduce((sum, key) => sum + stock[key], 0);
}

// Draw a gift weighted by its wheel segment count, skipping gifts that are out
// of stock. Each in-stock gift's chance equals config[key] / sum(config[in-stock]).
// Returns null only when every gift is exhausted.
export function drawGift(stock: GiftInventory, config: WheelConfig): GiftKey | null {
  const inStock = GIFT_KEYS.filter((key) => stock[key] > 0);
  if (inStock.length === 0) return null;

  const total = inStock.reduce((sum, key) => sum + config[key], 0);
  if (total <= 0) return null;

  let r = Math.random() * total;
  for (const key of inStock) {
    r -= config[key];
    if (r < 0) return key;
  }
  return inStock[inStock.length - 1];
}

export interface WheelOdds {
  luck: number;
  gifts: Record<GiftKey, number>;
}

// True odds for each gift: each gift's chance equals config[key] / sum(config)
// over the gifts still in stock. Out-of-stock gifts drop to 0 and the remaining
// gifts scale up naturally.
export function computeWheelOdds(stock: GiftInventory, config: WheelConfig): WheelOdds {
  const gifts = {} as Record<GiftKey, number>;
  for (const key of GIFT_KEYS) gifts[key] = 0;

  const inStock = GIFT_KEYS.filter((key) => stock[key] > 0);
  const total = inStock.reduce((sum, key) => sum + config[key], 0);
  if (total > 0) {
    for (const key of inStock) gifts[key] = config[key] / total;
  }

  return { luck: 0, gifts };
}

// Decide a spin outcome: draw a gift weighted by its segment count and map it to
// a matching wheel segment. Gấu bông is shown on the "may mắn lần sau" (luck)
// segments. When every gift is exhausted the wheel can only land on a luck
// segment with no prize.
export function pickWheelResult(
  stock: GiftInventory,
  config: WheelConfig,
): { index: number; gift: GiftKey | null } {
  const segments = buildWheelSegments(config);
  const luckIndices = segments
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment }) => segment.gift === null);

  const gift = drawGift(stock, config);
  if (!gift) {
    const chosen = luckIndices[Math.floor(Math.random() * luckIndices.length)];
    return { index: chosen.index, gift: null };
  }

  const matches =
    gift === 'gau'
      ? luckIndices
      : segments
          .map((segment, index) => ({ segment, index }))
          .filter(({ segment }) => segment.gift === gift);
  const chosen = matches[Math.floor(Math.random() * matches.length)] ?? matches[0];
  return { index: chosen.index, gift };
}
