export type GiftKey = 'odu' | 'gau' | 'v10' | 'v15' | 'v20';

// Kept for backward compatibility with claims stored before the wheel redesign.
export type WheelGift = GiftKey | 'unlucky';

export type GiftInventory = Record<GiftKey, number>;

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

// 12 segments. A luck segment ("may mắn lần sau") awards a Gấu bông (gau) while
// gau is in stock. Segment counts are proportional to the default stock, so the
// wheel looks consistent with the weighted-by-stock draw.
const SEGMENT_COUNTS: { label: string; icon: string; gift: GiftKey | null; count: number }[] = [
  { label: 'Ô dù', icon: '☂️', gift: 'odu', count: 2 },
  { label: 'May mắn', icon: '🍀', gift: null, count: 3 },
  { label: 'Giảm 10%', icon: '🎫', gift: 'v10', count: 3 },
  { label: 'Giảm 15%', icon: '🎫', gift: 'v15', count: 2 },
  { label: 'Giảm 20%', icon: '🎫', gift: 'v20', count: 2 },
];

function buildWheelSegments(): WheelSegment[] {
  const segments: WheelSegment[] = [];
  const remaining = SEGMENT_COUNTS.map((s) => s.count);
  const total = SEGMENT_COUNTS.reduce((sum, s) => sum + s.count, 0);

  for (let placed = 0; placed < total; placed++) {
    let best = -1;
    let bestRatio = -1;
    for (let i = 0; i < SEGMENT_COUNTS.length; i++) {
      if (remaining[i] <= 0) continue;
      const ratio = remaining[i] / SEGMENT_COUNTS[i].count;
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = i;
      }
    }
    segments.push({
      label: SEGMENT_COUNTS[best].label,
      icon: SEGMENT_COUNTS[best].icon,
      gift: SEGMENT_COUNTS[best].gift,
    });
    remaining[best] -= 1;
  }

  return segments;
}

export const WHEEL_SEGMENTS: WheelSegment[] = buildWheelSegments();

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

// Draw a gift weighted by remaining stock: the chance of each gift equals
// stock[key] / totalStock. A gift with 0 stock is never drawn, and its share is
// redistributed automatically to the gifts that still have stock. Returns null
// only when every gift is exhausted.
export function drawGift(stock: GiftInventory): GiftKey | null {
  const total = totalStock(stock);
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const key of GIFT_KEYS) {
    r -= stock[key];
    if (r < 0) return key;
  }
  return GIFT_KEYS[GIFT_KEYS.length - 1];
}

export interface WheelOdds {
  luck: number;
  gifts: Record<GiftKey, number>;
}

// True odds for each gift: each gift's chance equals stock[key] / totalStock.
// When a gift is sold out its chance drops to 0 and the remaining gifts scale up
// naturally.
export function computeWheelOdds(stock: GiftInventory): WheelOdds {
  const gifts = {} as Record<GiftKey, number>;
  for (const key of GIFT_KEYS) gifts[key] = 0;

  const total = totalStock(stock);
  if (total > 0) {
    for (const key of GIFT_KEYS) gifts[key] = stock[key] / total;
  }

  return { luck: 0, gifts };
}

// Decide a spin outcome: draw a gift weighted by remaining stock and map it
// to a matching wheel segment. Gấu bông is shown on the "may mắn lần sau" (luck)
// segments. When every gift is exhausted the wheel can only land on a luck
// segment with no prize.
export function pickWheelResult(stock: GiftInventory): {
  index: number;
  gift: GiftKey | null;
} {
  const luckIndices = WHEEL_SEGMENTS.map((segment, index) => ({
    segment,
    index,
  })).filter(({ segment }) => segment.gift === null);

  const gift = drawGift(stock);
  if (!gift) {
    const chosen = luckIndices[Math.floor(Math.random() * luckIndices.length)];
    return { index: chosen.index, gift: null };
  }

  const matches =
    gift === 'gau'
      ? luckIndices
      : WHEEL_SEGMENTS.map((segment, index) => ({ segment, index })).filter(
          ({ segment }) => segment.gift === gift,
        );
  const chosen = matches[Math.floor(Math.random() * matches.length)] ?? matches[0];
  return { index: chosen.index, gift };
}
