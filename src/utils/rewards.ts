export type GiftKey = 'ao' | 'tui' | 'odu' | 'gau';

export type WheelGift = GiftKey | 'unlucky';

export type GiftInventory = Record<GiftKey, number>;

export interface Gift {
  key: WheelGift;
  name: string;
  icon: string;
}

export const GIFTS: Record<WheelGift, Gift> = {
  ao: { key: 'ao', name: 'Áo', icon: '👕' },
  tui: { key: 'tui', name: 'Túi', icon: '🎒' },
  odu: { key: 'odu', name: 'Ô dù', icon: '☂️' },
  gau: { key: 'gau', name: 'Gấu bông', icon: '🧸' },
  unlucky: { key: 'unlucky', name: 'Chúc bạn may mắn lần sau', icon: '🍀' },
};

export const GIFT_KEYS: GiftKey[] = ['ao', 'tui', 'odu', 'gau'];

// Gifts the player can pick directly (600+ tier). Gấu bông is NOT pickable —
// it is won by landing on a "may mắn lần sau" (luck) segment of the wheel.
export const WHEEL_GIFT_KEYS: GiftKey[] = ['ao', 'tui', 'odu'];

export interface WheelSegment {
  label: string;
  gift: GiftKey | null;
}

export const LUCK_LABEL = '🍀 Chúc bạn may mắn lần sau!';

// The wheel mixes prize segments with "may mắn lần sau" (luck) segments. A luck
// segment awards a Gấu bông (gau) while gau is in stock — so every outcome is a
// prize and the luck label is simply the visual for the Gấu bông.
export const WHEEL_SEGMENTS: WheelSegment[] = [
  { label: '👕 Áo', gift: 'ao' },
  { label: '🍀 Chúc bạn may mắn lần sau', gift: null },
  { label: '🎒 Túi', gift: 'tui' },
  { label: '☂️ Ô dù', gift: 'odu' },
  { label: '🍀 Chúc bạn may mắn lần sau', gift: null },
  { label: '👕 Áo', gift: 'ao' },
  { label: '☂️ Ô dù', gift: 'odu' },
  { label: '🍀 Chúc bạn may mắn lần sau', gift: null },
  { label: '🎒 Túi', gift: 'tui' },
  { label: '🍀 Chúc bạn may mắn lần sau', gift: null },
];

export const INVENTORY_DEFAULT: Record<GiftKey, number> = {
  ao: 100,
  tui: 100,
  odu: 100,
  gau: 100,
};

export function totalStock(stock: GiftInventory): number {
  return stock.ao + stock.tui + stock.odu + stock.gau;
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
