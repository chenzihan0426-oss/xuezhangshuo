import { describe, expect, it } from 'vitest';
import { applyFilters, describeFilters } from '../path-filters';
import type { SeniorPath } from '../types';

function fake(overrides: Partial<SeniorPath> = {}): SeniorPath {
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

describe('applyFilters', () => {
  it('no filters returns all', () => {
    const paths = [fake(), fake(), fake()];
    expect(applyFilters(paths, {}).length).toBe(3);
  });

  it('minJobChanges filters out lower', () => {
    const r = applyFilters([fake({ job_changes: 0 }), fake({ job_changes: 3 })], { minJobChanges: 2 });
    expect(r.length).toBe(1);
    expect(r[0].job_changes).toBe(3);
  });

  it('onlySwitchedIndustry removes non-switched', () => {
    const r = applyFilters(
      [fake({ industry_changes: 0 }), fake({ industry_changes: 2 })],
      { onlySwitchedIndustry: true },
    );
    expect(r.length).toBe(1);
  });

  it('onlyStayed requires same first_company_tier and five_year_company_tier', () => {
    const r = applyFilters(
      [fake({ first_company_tier: 1, five_year_company_tier: 1 }), fake({ first_company_tier: 1, five_year_company_tier: 2 })],
      { onlyStayed: true },
    );
    expect(r.length).toBe(1);
  });

  it('salary range works', () => {
    const r = applyFilters(
      [fake({ five_year_salary: 100_000 }), fake({ five_year_salary: 400_000 }), fake({ five_year_salary: 800_000 })],
      { minSalary: 200_000, maxSalary: 500_000 },
    );
    expect(r.length).toBe(1);
    expect(r[0].five_year_salary).toBe(400_000);
  });

  it('startYear exact match', () => {
    const r = applyFilters([fake({ start_year: 2019 }), fake({ start_year: 2020 })], { startYear: 2020 });
    expect(r.length).toBe(1);
  });
});

describe('describeFilters', () => {
  it('empty → empty array', () => {
    expect(describeFilters({})).toEqual([]);
  });
  it('humanizes min/max', () => {
    const r = describeFilters({ minJobChanges: 2, onlySwitchedIndustry: true, startYear: 2021 });
    expect(r).toContain('跳槽 ≥ 2 次');
    expect(r).toContain('只看转过行的');
    expect(r).toContain('起步 2021');
  });
});
