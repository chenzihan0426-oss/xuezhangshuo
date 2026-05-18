/**
 * 环境校正引擎(对应文档 §4.2)⭐ 决赛胜负手
 *
 * 输入:一条师兄师姐路径
 * 输出:基础分 / 校正分 / 因子分解 / 自然语言解释
 */
import { AI_RISK_TABLE, CURRENT_YEAR, INDUSTRY_INDEX, POLICY_EVENTS } from './constants';
import type { SeniorPath } from './types';
import { clamp } from './utils';

export interface CorrectPathOutput {
  original: number;
  corrected: number;
  factors: {
    industry: number;
    ai_risk: number;
    policy_events: string[];
  };
  explanation: string;
}

/**
 * 基础评分:依据 5 年后画像
 *  - 薪资:50 万封顶 50 分(线性)
 *  - 职级:1-5 → 10-50 分
 *  - 稳定性:每跳一次扣 5 分,封顶 20 分
 */
export function baseScore(path: SeniorPath): number {
  const salary = path.five_year_salary ?? 0;
  const salaryScore = Math.min(50, salary / 10_000);
  const levelScore = levelToScore(path.five_year_level) * 10;
  const stabilityScore = Math.max(0, 20 - path.job_changes * 5);
  return clamp(salaryScore + levelScore + stabilityScore, 0, 100);
}

function levelToScore(level: string | undefined): number {
  const map: Record<string, number> = { intern: 1, graduate: 1, junior: 2, mid: 3, senior: 4, lead: 5 };
  return map[level ?? 'graduate'] ?? 1;
}

/**
 * 行业景气因子 = now_index / start_year_index
 *  > 1: 行业比起步时更景气
 *  < 1: 行业现在比起步时差
 */
export function industryFactor(industry: string, startYear: number, currentYear = CURRENT_YEAR): number {
  const series = INDUSTRY_INDEX[industry];
  if (!series) return 1.0;
  const now = series[currentYear] ?? lastDefined(series, currentYear) ?? 1.0;
  const then = series[startYear] ?? lastDefined(series, startYear) ?? 1.0;
  if (then === 0) return 1.0;
  return now / then;
}

function lastDefined(series: Record<number, number>, upTo: number): number | undefined {
  const years = Object.keys(series)
    .map(Number)
    .filter((y) => y <= upTo)
    .sort((a, b) => b - a);
  return years.length ? series[years[0]] : undefined;
}

/**
 * AI 替代风险因子。risk ∈ [0,1],返回 1 - risk * 0.3,封顶 [0.7, 1.0]。
 */
export function aiFactor(positionCategory: string): { risk: number; factor: number } {
  const risk = AI_RISK_TABLE[positionCategory] ?? 0.3;
  const factor = clamp(1 - risk * 0.3, 0.7, 1.0);
  return { risk, factor };
}

/**
 * 政策事件遮罩:只考虑 path.start_year 之后才发生的事件,因为这些事件
 * "在该师兄起步时还未发生",所以是后置外生冲击。
 */
export function policyFactor(industry: string, startYear: number): { factor: number; events: string[] } {
  let factor = 1.0;
  const events: string[] = [];
  for (const ev of POLICY_EVENTS) {
    if (ev.industry === industry && ev.year > startYear) {
      factor *= ev.impact;
      events.push(ev.name);
    }
  }
  return { factor, events };
}

/**
 * 综合校正一条路径
 */
export function correctPath(path: SeniorPath, currentYear = CURRENT_YEAR): CorrectPathOutput {
  const base = baseScore(path);
  const ind = industryFactor(path.first_industry, path.start_year, currentYear);
  const ai = aiFactor(path.first_position_category);
  const pol = policyFactor(path.first_industry, path.start_year);

  const corrected = clamp(base * ind * ai.factor * pol.factor, 0, 100);

  return {
    original: round1(base),
    corrected: round1(corrected),
    factors: {
      industry: round2(ind),
      ai_risk: round2(ai.risk),
      policy_events: pol.events,
    },
    explanation: generateExplanation(ind, ai.risk, pol.events),
  };
}

/**
 * 把因子翻译成 1-2 句"人话"。用于结果页校正面板默认 copy。
 * (扣子 Bot 对话里会自带更生动的版本,这里走规则保底)
 */
export function generateExplanation(industry: number, aiRisk: number, events: string[]): string {
  const parts: string[] = [];
  if (industry < 0.7) parts.push(`所在行业现在比 5 年前明显降温(景气度 ${(industry * 100).toFixed(0)}%)`);
  else if (industry > 1.1) parts.push(`行业现在比 5 年前更景气(景气度 ${(industry * 100).toFixed(0)}%)`);
  if (aiRisk >= 0.6) parts.push(`AI 对该岗位有较高替代风险(${(aiRisk * 100).toFixed(0)}%)`);
  if (events.length) parts.push(`经历过外生事件:${events.join('、')}`);
  if (!parts.length) parts.push('行业环境与岗位特征相对稳定,校正幅度有限');
  return parts.join('。') + '。';
}

function round1(x: number) {
  return Math.round(x * 10) / 10;
}
function round2(x: number) {
  return Math.round(x * 100) / 100;
}
