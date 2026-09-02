import { describe, expect, it } from 'vitest';
import { SQ_FT_PER_UNIT, toSqFt } from '@/lib/units';

/**
 * Area conversion.
 *
 * areaSqFt exists so that filtering and sorting compare like with like. If a
 * conversion is wrong, the site still looks correct while returning the wrong
 * listings - a silent failure, which is the kind worth pinning down.
 */
describe('toSqFt', () => {
  it('converts each supported unit', () => {
    expect(toSqFt(1, 'SQ_FT')).toBe(1);
    expect(toSqFt(1, 'SQ_YD')).toBe(9);
    expect(toSqFt(1, 'MARLA')).toBe(225);
    expect(toSqFt(1, 'KANAL')).toBe(4500);
    expect(toSqFt(1, 'ACRE')).toBe(43560);
    expect(toSqFt(1, 'SQ_M')).toBeCloseTo(10.76, 2);
  });

  it('keeps a kanal larger than a square foot, which is the whole point', () => {
    // The bug this column prevents: comparing "2 kanal" against "400 sq ft"
    // as though the numbers were on the same scale.
    expect(toSqFt(2, 'KANAL')).toBeGreaterThan(toSqFt(400, 'SQ_FT'));
  });

  it('rounds to two decimals rather than carrying float noise', () => {
    expect(toSqFt(3, 'SQ_M')).toBe(32.29);
  });

  it('has a conversion factor for every unit the schema accepts', () => {
    for (const unit of ['SQ_YD', 'SQ_FT', 'SQ_M', 'MARLA', 'KANAL', 'ACRE'] as const) {
      expect(SQ_FT_PER_UNIT[unit]).toBeGreaterThan(0);
    }
  });
});
