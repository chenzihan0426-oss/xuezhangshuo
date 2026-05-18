import { describe, expect, it } from 'vitest';
import { clamp, cosineSimilarity, formatSalary, mean, quantile, topNCounts } from '../utils';

describe('cosineSimilarity', () => {
  it('identical vectors → 1', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 5);
  });
  it('orthogonal → 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });
  it('different length → 0', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });
  it('zero vector → 0 (no nan)', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 1, 1])).toBe(0);
  });
});

describe('clamp', () => {
  it('passes through in range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('clamps low', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it('clamps high', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('formatSalary', () => {
  it('万 format', () => {
    expect(formatSalary(250_000)).toBe('25.0 万');
  });
  it('small numbers', () => {
    expect(formatSalary(5000)).toBe('5000 元');
  });
  it('null', () => {
    expect(formatSalary(null)).toBe('-');
  });
});

describe('quantile', () => {
  it('median', () => {
    expect(quantile([1, 2, 3, 4, 5], 0.5)).toBe(3);
  });
  it('empty', () => {
    expect(quantile([], 0.5)).toBe(0);
  });
});

describe('mean', () => {
  it('average', () => {
    expect(mean([1, 2, 3])).toBe(2);
  });
  it('empty → 0', () => {
    expect(mean([])).toBe(0);
  });
});

describe('topNCounts', () => {
  it('returns top frequencies', () => {
    const r = topNCounts(['a', 'a', 'b', 'b', 'b', 'c'], (x) => x, 2);
    expect(r[0]).toEqual({ key: 'b', count: 3 });
    expect(r[1]).toEqual({ key: 'a', count: 2 });
  });
});
