/**
 * 匹配算法的纯函数(无 server-only 依赖,可在客户端引用)
 */
import { LEVEL_ORDER } from './constants';
import type { Level, SeniorPath } from './types';

/** 把 level 翻译成包含 ±1 级的数组 */
export function adjacentLevels(level: Level): Level[] {
  const order = LEVEL_ORDER[level];
  if (order === undefined) return [level];
  const all = Object.entries(LEVEL_ORDER).sort((a, b) => a[1] - b[1]);
  return all
    .filter(([, ord]) => Math.abs(ord - order) <= 1)
    .map(([k]) => k as Level);
}

export interface SplitGroupsOutput {
  same: SeniorPath[];
  higher: SeniorPath[];
  lower: SeniorPath[];
}

/**
 * school_tier 数值越小代表层级越高(1=C9)。
 *   同背景: |delta| <= 1
 *   更高:   delta < -1 (候选 tier 更小)
 *   更低:   delta > 1
 */
export function splitGroups(candidates: SeniorPath[], userTier: number): SplitGroupsOutput {
  const same: SeniorPath[] = [];
  const higher: SeniorPath[] = [];
  const lower: SeniorPath[] = [];
  for (const c of candidates) {
    const delta = c.school_tier - userTier;
    if (Math.abs(delta) <= 1) same.push(c);
    else if (delta < -1) higher.push(c);
    else lower.push(c);
  }
  return { same, higher, lower };
}
