import { describe, expect, it } from 'vitest';
import { adjacentLevels, splitGroups } from '../match-helpers';
import type { Level, SeniorPath } from '../types';

function fakeCandidate(school_tier: number): SeniorPath {
  return {
    id: 'x',
    source: 'mock',
    school_tier: school_tier as any,
    major_category: 'computer_science',
    start_year: 2020,
    first_industry: 'internet',
    first_position_category: 'engineer_backend',
    first_level: 'graduate',
    job_changes: 0,
    industry_changes: 0,
    is_anonymized: true,
  };
}

describe('adjacentLevels', () => {
  it('expands graduate to ±1', () => {
    const r = adjacentLevels('graduate');
    expect(r).toContain('graduate');
    expect(r).toContain('junior');
    expect(r).toContain('intern');
  });
  it('mid expands to junior/senior', () => {
    const r = adjacentLevels('mid' as Level);
    expect(r).toContain('junior');
    expect(r).toContain('mid');
    expect(r).toContain('senior');
  });
});

describe('splitGroups', () => {
  it('user_tier=3 → c9(1) goes to higher, 二本(5) goes to lower', () => {
    const candidates: SeniorPath[] = [
      fakeCandidate(1),
      fakeCandidate(2),
      fakeCandidate(3),
      fakeCandidate(3),
      fakeCandidate(4),
      fakeCandidate(5),
    ];
    const { same, higher, lower } = splitGroups(candidates, 3);
    // |delta|<=1: tier 2,3,3,4 → 4 个
    expect(same.length).toBe(4);
    // tier 1 is delta=-2 → higher
    expect(higher.length).toBe(1);
    // tier 5 is delta=2 → lower
    expect(lower.length).toBe(1);
  });
  it('user_tier=1 → 几乎全部都是 same 或 lower', () => {
    const candidates = [1, 2, 3, 4, 5].map(fakeCandidate);
    const { higher } = splitGroups(candidates, 1);
    expect(higher.length).toBe(0);
  });
});
