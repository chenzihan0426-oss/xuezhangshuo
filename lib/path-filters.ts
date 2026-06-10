/**
 * 客户端筛选维度
 */
import type { SeniorPath } from './types';

export interface PathFilters {
  /** 跳槽次数下限(>=) */
  minJobChanges?: number;
  /** 跳槽次数上限(<=) */
  maxJobChanges?: number;
  /** 是否只看转过行的 */
  onlySwitchedIndustry?: boolean;
  /** 是否只看留在同 tier 公司的 */
  onlyStayed?: boolean;
  /** 5 年年薪下限(元) */
  minSalary?: number;
  /** 5 年年薪上限(元) */
  maxSalary?: number;
  /** 起步年份 */
  startYear?: number;
}

export function applyFilters(paths: SeniorPath[], f: PathFilters, salaryScale = 1): SeniorPath[] {
  return paths.filter((p) => {
    if (f.minJobChanges !== undefined && p.job_changes < f.minJobChanges) return false;
    if (f.maxJobChanges !== undefined && p.job_changes > f.maxJobChanges) return false;
    if (f.onlySwitchedIndustry && p.industry_changes < 1) return false;
    if (f.onlyStayed) {
      if (p.first_company_tier === undefined || p.first_company_tier !== p.five_year_company_tier) return false;
    }
    // 薪资阈值与页面展示同口径:都用 ×salaryScale 后的值比较
    const displaySalary = (p.five_year_salary ?? 0) * salaryScale;
    if (f.minSalary !== undefined && displaySalary < f.minSalary) return false;
    if (f.maxSalary !== undefined && displaySalary > f.maxSalary) return false;
    if (f.startYear !== undefined && p.start_year !== f.startYear) return false;
    return true;
  });
}

/** 把过滤器组合成给图表用的描述 */
export function describeFilters(f: PathFilters): string[] {
  const parts: string[] = [];
  if (f.minJobChanges !== undefined && f.maxJobChanges !== undefined && f.minJobChanges === f.maxJobChanges)
    parts.push(`恰好跳槽 ${f.minJobChanges} 次`);
  else if (f.minJobChanges !== undefined) parts.push(`跳槽 ≥ ${f.minJobChanges} 次`);
  else if (f.maxJobChanges !== undefined) parts.push(`跳槽 ≤ ${f.maxJobChanges} 次`);
  if (f.onlySwitchedIndustry) parts.push('只看转过行的');
  if (f.onlyStayed) parts.push('只看留在同 tier 的');
  if (f.minSalary !== undefined) parts.push(`年薪 ≥ ${(f.minSalary / 10000).toFixed(0)} 万`);
  if (f.maxSalary !== undefined) parts.push(`年薪 ≤ ${(f.maxSalary / 10000).toFixed(0)} 万`);
  if (f.startYear !== undefined) parts.push(`起步 ${f.startYear}`);
  return parts;
}

export const EMPTY_FILTERS: PathFilters = {};
