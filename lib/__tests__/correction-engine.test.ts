import { describe, expect, it } from 'vitest';
import {
  aiFactor,
  baseScore,
  correctPath,
  generateExplanation,
  industryFactor,
  policyFactor,
} from '../correction-engine';
import type { SeniorPath } from '../types';

function fakePath(overrides: Partial<SeniorPath> = {}): SeniorPath {
  return {
    id: 'p1',
    source: 'mock',
    school_tier: 3,
    major_category: 'computer_science',
    start_year: 2020,
    first_industry: 'internet',
    first_position_category: 'engineer_backend',
    first_level: 'graduate',
    first_company_tier: 1,
    five_year_company_tier: 1,
    five_year_industry: 'internet',
    five_year_level: 'mid',
    five_year_salary: 350_000,
    job_changes: 1,
    industry_changes: 0,
    is_anonymized: true,
    ...overrides,
  };
}

describe('baseScore', () => {
  it('linear in salary', () => {
    const low = baseScore(fakePath({ five_year_salary: 100_000 }));
    const high = baseScore(fakePath({ five_year_salary: 500_000 }));
    expect(high).toBeGreaterThan(low);
  });
  it('penalizes job_changes', () => {
    const stable = baseScore(fakePath({ job_changes: 0 }));
    const jumpy = baseScore(fakePath({ job_changes: 3 }));
    expect(stable).toBeGreaterThan(jumpy);
  });
  it('clamps to [0, 100]', () => {
    const huge = baseScore(fakePath({ five_year_salary: 5_000_000, five_year_level: 'lead' }));
    expect(huge).toBeLessThanOrEqual(100);
  });
});

describe('industryFactor', () => {
  it('returns 1.0 for unknown industry', () => {
    expect(industryFactor('nonexistent', 2020, 2026)).toBe(1.0);
  });
  it('compares current vs start year', () => {
    // internet 2020=1.0, 2026=0.7
    expect(industryFactor('internet', 2020, 2026)).toBeCloseTo(0.7, 2);
  });
  it('returns >1 when industry is up', () => {
    // auto_ev 2020=0.8, 2026=0.95
    expect(industryFactor('auto_ev', 2020, 2026)).toBeGreaterThan(1);
  });
});

describe('aiFactor', () => {
  it('default 0.3 for unknown', () => {
    const r = aiFactor('nonexistent');
    expect(r.risk).toBe(0.3);
    expect(r.factor).toBeCloseTo(1 - 0.3 * 0.3, 5);
  });
  it('high-risk gets factor 0.7 floor', () => {
    const r = aiFactor('customer_service');
    expect(r.factor).toBeGreaterThanOrEqual(0.7);
  });
});

describe('policyFactor', () => {
  it('applies events that happened after start_year', () => {
    const r = policyFactor('education_training', 2020);
    expect(r.events).toContain('双减政策');
    expect(r.factor).toBeCloseTo(0.30, 5);
  });
  it('skips events that happened before start_year', () => {
    const r = policyFactor('education_training', 2022);
    expect(r.events).toEqual([]);
    expect(r.factor).toBe(1.0);
  });
});

describe('correctPath integration', () => {
  it('互联网 2020 起步 → 2026 corrected < original', () => {
    const result = correctPath(fakePath({ start_year: 2020, first_industry: 'internet' }), 2026);
    expect(result.corrected).toBeLessThan(result.original);
    expect(result.factors.policy_events).toContain('互联网大裁员');
  });
  it('教培 2020 起步 → 双减重击', () => {
    const result = correctPath(
      fakePath({ start_year: 2020, first_industry: 'education_training' }),
      2026,
    );
    expect(result.corrected).toBeLessThan(result.original * 0.5);
  });
  it('稳定行业不大幅校正', () => {
    const result = correctPath(
      fakePath({ start_year: 2020, first_industry: 'tech_hardware' }),
      2026,
    );
    expect(Math.abs(result.corrected - result.original)).toBeLessThan(20);
  });
});

describe('generateExplanation', () => {
  it('mentions industry when significantly down', () => {
    const e = generateExplanation(0.5, 0.3, []);
    expect(e).toMatch(/景气/);
  });
  it('mentions AI risk when high', () => {
    const e = generateExplanation(1.0, 0.8, []);
    expect(e).toMatch(/AI/);
  });
  it('mentions policy events when present', () => {
    const e = generateExplanation(1.0, 0.3, ['双减政策']);
    expect(e).toMatch(/双减/);
  });
  it('fallback when nothing notable', () => {
    const e = generateExplanation(1.0, 0.3, []);
    expect(e).toMatch(/相对稳定/);
  });
});
