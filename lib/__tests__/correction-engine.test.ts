import { describe, expect, it } from 'vitest';
import {
  aiFactor,
  baseScore,
  cohortFactor,
  correctPath,
  generateExplanation,
  industryFactor,
  offerSalaryFactor,
  personalBoostFactor,
  policyFactor,
} from '../correction-engine';
import type { SeniorPath, UserBackground } from '../types';

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
    // tech_hardware 2020 → 2026:industry 1.20 + cohort 1.15(硬件红利后置)+ AI 因子
    // 加 cohort 后差幅自然扩大,允许 ≤ 25 内
    const result = correctPath(
      fakePath({ start_year: 2020, first_industry: 'tech_hardware' }),
      2026,
    );
    expect(Math.abs(result.corrected - result.original)).toBeLessThanOrEqual(25);
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
  it('mentions cohort when significantly off-baseline', () => {
    const e = generateExplanation(1.0, 0.3, [], 0.6);
    expect(e).toMatch(/红利期|时代红利/);
  });
  it('mentions personal boost when significantly above 1', () => {
    const e = generateExplanation(1.0, 0.3, [], 1.0, 1.12);
    expect(e).toMatch(/起点|学校/);
  });
  it('mentions offer salary advantage when high', () => {
    const e = generateExplanation(1.0, 0.3, [], 1.0, 1.0, 1.25);
    expect(e).toMatch(/Offer|起薪/);
  });
});

describe('cohortFactor', () => {
  it('互联网 2020 师兄 / 2026 用户:用户起步更难,cohort < 1', () => {
    const v = cohortFactor('internet', 2020, 2026);
    expect(v).toBeLessThan(1);
  });
  it('创业 2021 师兄(双创红利)/ 2026 用户:用户更难,cohort < 1', () => {
    const v = cohortFactor('startup', 2021, 2026);
    expect(v).toBeLessThan(1);
  });
  it('未知行业返回 1.0', () => {
    expect(cohortFactor('non_existent_industry', 2020, 2026)).toBe(1.0);
  });
  it('clamp 边界 [0.5, 1.5]', () => {
    const v = cohortFactor('education_training', 2020, 2026);
    expect(v).toBeGreaterThanOrEqual(0.5);
    expect(v).toBeLessThanOrEqual(1.5);
  });
});

describe('personalBoostFactor', () => {
  const minimalBg = (overrides: Partial<UserBackground> = {}): UserBackground => ({
    school_id: 0,
    school_tier: 4,
    major_id: 0,
    major_category: 'computer_science',
    education_level: '本科',
    graduation_year: 2026,
    gpa_band: 'unknown',
    ...overrides,
  });

  it('普通本科基线 = 1.0', () => {
    const r = personalBoostFactor(minimalBg());
    expect(r.factor).toBe(1.0);
  });
  it('C9 + 3.5+ + 长实习 → 明显加成', () => {
    const r = personalBoostFactor(
      minimalBg({
        school_tier: 1,
        gpa_band: '3.5+',
        internships: [{ company_id: 1, position_category: 'pm', duration_months: 6 }],
      }),
    );
    expect(r.factor).toBeGreaterThan(1.15);
    expect(r.factor).toBeLessThanOrEqual(1.3);
  });
  it('二本 + <3.0 → 折扣', () => {
    const r = personalBoostFactor(minimalBg({ school_tier: 5, gpa_band: '<3.0' }));
    expect(r.factor).toBeLessThan(1.0);
  });
  it('undefined background 返回 1', () => {
    expect(personalBoostFactor(undefined).factor).toBe(1.0);
  });
});

describe('offerSalaryFactor', () => {
  it('user 30 万 vs baseline 20 万 → factor ≈ 1.3 (capped)', () => {
    const v = offerSalaryFactor(300_000, 200_000);
    expect(v).toBe(1.3); // clamp 上限
  });
  it('user 15 万 vs baseline 20 万 → factor ≈ 0.8 (capped)', () => {
    const v = offerSalaryFactor(150_000, 200_000);
    expect(v).toBe(0.8); // clamp 下限
  });
  it('user 22 万 vs baseline 20 万 → factor ≈ 1.1', () => {
    const v = offerSalaryFactor(220_000, 200_000);
    expect(v).toBeCloseTo(1.1, 1);
  });
  it('缺失值返回 1.0', () => {
    expect(offerSalaryFactor(undefined, 200_000)).toBe(1.0);
    expect(offerSalaryFactor(200_000, undefined)).toBe(1.0);
    expect(offerSalaryFactor(200_000, 0)).toBe(1.0);
  });
});
