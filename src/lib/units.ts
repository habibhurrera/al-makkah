import { AreaUnit } from '@/generated/prisma';

/**
 * Area handling for AL-MAKKAH.
 *
 * Listings in Hyderabad are quoted in whatever unit the owner uses, so the
 * uploader picks the unit and we store their number and their unit verbatim -
 * that is what the site displays. Alongside it we store a derived square-foot
 * value used ONLY for filtering and sorting, so a 2-kanal plot and a 400 sq ft
 * flat can be compared against each other.
 *
 * MARLA/KANAL note: Pakistan has two conventions. The modern one (1 marla =
 * 225 sq ft, 1 kanal = 4500 sq ft) is what property portals use today; the
 * older colonial one is 272.25 / 5445. We use the modern convention. If
 * AL-MAKKAH quotes the old measure, change SQ_FT_PER_UNIT and backfill.
 */
export const SQ_FT_PER_UNIT: Record<AreaUnit, number> = {
  SQ_FT: 1,
  SQ_YD: 9,
  MARLA: 225,
  KANAL: 4500,
  ACRE: 43560,
  SQ_M: 10.7639104,
};

export const AREA_UNIT_LABEL: Record<AreaUnit, string> = {
  SQ_FT: 'sq ft',
  SQ_YD: 'sq yd',
  MARLA: 'Marla',
  KANAL: 'Kanal',
  ACRE: 'Acre',
  SQ_M: 'sq m',
};

/** Canonical square-foot value written to Property.areaSqFt. */
export function toSqFt(value: number, unit: AreaUnit): number {
  return Math.round(value * SQ_FT_PER_UNIT[unit] * 100) / 100;
}

/** Renders the area the way the uploader entered it, e.g. "500 sq yd". */
export function formatArea(value: number, unit: AreaUnit): string {
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return `${rounded.toLocaleString('en-PK')} ${AREA_UNIT_LABEL[unit]}`;
}

/**
 * PKR in the local convention: 1 lakh = 100,000, 1 crore = 10,000,000.
 * Pakistani buyers read "4.5 Crore" far faster than "45,000,000".
 */
export function formatPkr(amount: number): string {
  const CRORE = 10_000_000;
  const LAKH = 100_000;
  if (amount >= CRORE) return `PKR ${trim(amount / CRORE)} Crore`;
  if (amount >= LAKH) return `PKR ${trim(amount / LAKH)} Lakh`;
  return `PKR ${amount.toLocaleString('en-PK')}`;
}

/** Monthly rent reads better in plain thousands than in lakh. */
export function formatRent(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK')}/month`;
}

function trim(n: number): string {
  return Number(n.toFixed(2)).toString();
}
