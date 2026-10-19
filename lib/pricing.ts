// Единый источник цен (сервер). Рубли берутся из settings.pro_price (меняется командой /setprices).
export type PeriodDays = 30 | 365;

export interface PeriodPrice {
  rub: number;
  stars: number;
  usdt: number;
}

export function getPricing(proPrice: number): Record<PeriodDays, PeriodPrice> {
  const month = Math.max(1, Math.round(proPrice || 990));
  return {
    30: { rub: month, stars: 500, usdt: 11 },
    365: { rub: Math.round(month * 12 * 0.8), stars: 4800, usdt: 105 },
  };
}
