import { describe, expect, it } from 'vitest';
import { generateInsights } from '../insights-engine';
import type { CorrectionResult, SeniorPath } from '../types';

function fakePath(overrides: Partial<SeniorPath> = {}): SeniorPath {
  return {
    id: Math.random().toString(),
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
    five_year_salary: 300_000,
    job_changes: 1,
    industry_changes: 0,
    is_anonymized: true,
    ...overrides,
  };
}

describe('generateInsights', () => {
  it('empty paths → returns "no-data" warn', () => {
    const r = generateInsights({ paths: [] });
    expect(r[0].id).toBe('no-data');
  });

  it('high early-jump rate triggers warn', () => {
    const paths = Array.from({ length: 100 }, () => fakePath({ job_changes: 3 }));
    const r = generateInsights({ paths, offerIndustry: 'internet' });
    expect(r.some((i) => i.id === 'early-jump')).toBe(true);
  });

  it('high industry-switch rate triggers warn', () => {
    const paths = Array.from({ length: 100 }, () =>
      fakePath({ industry_changes: 2, five_year_industry: 'real_estate' }),
    );
    const r = generateInsights({ paths });
    const warn = r.find((i) => i.id === 'industry-switch');
    expect(warn).toBeTruthy();
    expect(warn!.level).toBe('danger');
  });

  it('low industry index flags danger', () => {
    const paths = Array.from({ length: 50 }, () => fakePath());
    const r = generateInsights({ paths, offerIndustry: 'education_training' });
    expect(r.some((i) => i.id === 'industry-down' && i.level === 'danger')).toBe(true);
  });

  it('high AI risk position triggers warn', () => {
    const paths = Array.from({ length: 30 }, () => fakePath());
    const r = generateInsights({ paths, offerPositionCategory: 'customer_service' });
    const ai = r.find((i) => i.id === 'ai-risk');
    expect(ai).toBeTruthy();
    expect(ai!.level).toBe('danger');
  });

  it('low five-year salary triggers warn', () => {
    const paths = Array.from({ length: 30 }, () => fakePath({ five_year_salary: 100_000 }));
    const r = generateInsights({ paths });
    expect(r.some((i) => i.id === 'low-salary')).toBe(true);
  });

  it('big correction drop triggers danger', () => {
    const paths = Array.from({ length: 10 }, () => fakePath());
    const correction: CorrectionResult = {
      original_score: 80,
      corrected_score: 50,
      factors: { industry: 0.6, ai_risk: 0.3, policy_events: ['互联网大裁员'] },
      explanation: '行业景气度只有 60%。',
    };
    const r = generateInsights({ paths, correction });
    expect(r.some((i) => i.id === 'correction-drop' && i.level === 'danger')).toBe(true);
  });

  it('gender gap warning fires when male/female medians diverge', () => {
    const males = Array.from({ length: 30 }, () => fakePath({ gender: 'male', five_year_salary: 500_000 }));
    const females = Array.from({ length: 30 }, () => fakePath({ gender: 'female', five_year_salary: 350_000 }));
    const r = generateInsights({ paths: [...males, ...females] });
    expect(r.some((i) => i.id === 'gender-gap')).toBe(true);
  });

  it('slow salary growth flagged when 5y growth <= 50%', () => {
    const paths = Array.from({ length: 30 }, () =>
      fakePath({
        path_history: [
          { year: 2020, company_tier: 1, industry: 'internet', position: 'engineer_backend', level: 'graduate', salary: 200_000 },
          { year: 2021, company_tier: 1, industry: 'internet', position: 'engineer_backend', level: 'junior', salary: 215_000 },
          { year: 2022, company_tier: 1, industry: 'internet', position: 'engineer_backend', level: 'junior', salary: 225_000 },
          { year: 2023, company_tier: 1, industry: 'internet', position: 'engineer_backend', level: 'mid', salary: 240_000 },
          { year: 2024, company_tier: 1, industry: 'internet', position: 'engineer_backend', level: 'mid', salary: 260_000 },
          { year: 2025, company_tier: 1, industry: 'internet', position: 'engineer_backend', level: 'mid', salary: 280_000 },
        ],
        five_year_salary: 280_000,
      }),
    );
    const r = generateInsights({ paths });
    expect(r.some((i) => i.id === 'slow-salary-growth')).toBe(true);
  });

  it('top-tier-exit warns if started in tier 1 but 5y mostly out', () => {
    const paths = Array.from({ length: 60 }, () =>
      fakePath({ first_company_tier: 1, five_year_company_tier: 5 }),
    );
    const r = generateInsights({ paths });
    expect(r.some((i) => i.id === 'top-tier-exit')).toBe(true);
  });

  it('returns at most 5 insights, sorted by weight', () => {
    // Stack everything: high early jump, low salary, industry switch, dangerous industry, ai risk, big correction
    const paths = Array.from({ length: 100 }, () =>
      fakePath({
        job_changes: 3,
        industry_changes: 2,
        five_year_industry: 'real_estate',
        five_year_salary: 80_000,
      }),
    );
    const correction: CorrectionResult = {
      original_score: 90,
      corrected_score: 40,
      factors: { industry: 0.3, ai_risk: 0.8, policy_events: ['互联网大裁员'] },
      explanation: '严重校正',
    };
    const r = generateInsights({
      paths,
      correction,
      offerIndustry: 'education_training',
      offerPositionCategory: 'customer_service',
    });
    expect(r.length).toBeLessThanOrEqual(5);
    // 权重高的应该靠前
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].weight).toBeGreaterThanOrEqual(r[i].weight);
    }
  });
});
