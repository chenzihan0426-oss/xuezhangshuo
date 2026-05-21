/**
 * 环境校正引擎(对应文档 §4.2)⭐ 决赛胜负手
 *
 * 输入:一条师兄师姐路径(+ 可选:user background / offer / salary baseline)
 * 输出:基础分 / 校正分 / 因子分解 / 自然语言解释
 *
 * 校正乘式(v2):
 *   corrected = base
 *     × industry         (行业景气)
 *     × ai_factor        (AI 风险)
 *     × policy_factor    (政策事件)
 *     × cohort           (校招供需 / 时代红利)
 *     × personal_boost   (学校+学历+GPA+实习 综合,作用在 user 起点)
 *     × offer_salary     (Offer 薪资 vs 同岗位中位)
 */
import {
  AI_RISK_TABLE,
  COHORT_INDEX,
  CURRENT_YEAR,
  EDU_LEVEL_MULTIPLIER,
  ENABLE_BACKGROUND_PREMIUM,
  GPA_BAND_MULTIPLIER,
  INDUSTRY_INDEX,
  INTERNSHIP_MULTIPLIER,
  POLICY_EVENTS,
  SCHOOL_TIER_MULTIPLIER,
} from './constants';
import type { SeniorPath, UserBackground } from './types';
import { clamp } from './utils';

export interface CorrectPathOutput {
  original: number;
  corrected: number;
  factors: {
    industry: number;
    ai_risk: number;
    policy_events: string[];
    policy_factor: number;
    cohort: number;
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
  if (!series) {
    console.warn(`[correction] 未知行业「${industry}」,景气因子按 1.0(不校正)处理`);
    return 1.0;
  }
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
export function aiFactor(positionCategory: string): { risk: number; factor: number; known: boolean } {
  const known = positionCategory in AI_RISK_TABLE;
  if (!known) {
    console.warn(`[correction] 未知岗位「${positionCategory}」,AI 替代风险按相近岗位估算(0.3)`);
  }
  const risk = AI_RISK_TABLE[positionCategory] ?? 0.3;
  const factor = clamp(1 - risk * 0.3, 0.7, 1.0);
  return { risk, factor, known };
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
 * cohort 时代红利因子:取 path.start_year 当年的"行业校招供需"红利系数。
 * 例:2020 互联网 ≈ 1.10(红利期),2024 教培 ≈ 0.30(双减后)。
 *
 * 含义:这条师兄路径"踩到时代窗口"的程度。窗口好,他更容易跑出来,
 * 但用户(2026 起步)享受不到 → 反推用户分要相应折扣。
 */
export function cohortFactor(industry: string, startYear: number, currentYear = CURRENT_YEAR): number {
  const series = COHORT_INDEX[industry];
  if (!series) return 1.0;
  const then = series[startYear] ?? lastDefined(series, startYear) ?? 1.0;
  const now = series[currentYear] ?? lastDefined(series, currentYear) ?? 1.0;
  if (then === 0) return 1.0;
  // 用户起步在 now,师兄起步在 then。 cohort = now / then:
  //   师兄踩到红利(then 大),用户没踩到(now 小)→ cohort < 1,折扣
  //   师兄入场难(then 小),用户更容易(now 大)→ cohort > 1,加分
  return clamp(now / then, 0.5, 1.5);
}

/**
 * 个人起点加成:学校 × 学历 × GPA × 实习。
 * 作用在"用户自己的起点",不是每条 path。
 * 由开关 ENABLE_BACKGROUND_PREMIUM 控制,关闭时永远返回 1.0。
 */
export function personalBoostFactor(background: UserBackground | undefined): {
  factor: number;
  breakdown: { school: number; edu: number; gpa: number; internship: number };
} {
  const noop = { factor: 1.0, breakdown: { school: 1, edu: 1, gpa: 1, internship: 1 } };
  if (!ENABLE_BACKGROUND_PREMIUM || !background) return noop;
  const school = SCHOOL_TIER_MULTIPLIER[background.school_tier] ?? 1.0;
  const edu = EDU_LEVEL_MULTIPLIER[background.education_level] ?? 1.0;
  const gpa = GPA_BAND_MULTIPLIER[background.gpa_band] ?? 1.0;
  const internshipsArr = background.internships ?? [];
  const hasTop = internshipsArr.some((i) => i.duration_months >= 3);
  const internship = hasTop
    ? INTERNSHIP_MULTIPLIER.top
    : internshipsArr.length > 0
    ? INTERNSHIP_MULTIPLIER.some
    : INTERNSHIP_MULTIPLIER.none;
  // 总加成 clamp 在 [0.85, 1.3],避免极端
  const factor = clamp(school * edu * gpa * internship, 0.85, 1.3);
  return { factor, breakdown: { school, edu, gpa, internship } };
}

/**
 * Offer 薪资 vs 同岗位起薪基准 → 因子 ∈ [0.8, 1.3]。
 * 用户起薪比同岗位中位高很多 → 反映用户起点更强 → 5 年画像应更乐观;反之亦然。
 */
export function offerSalaryFactor(
  userSalaryMid: number | undefined,
  baseline: number | undefined,
): number {
  if (!userSalaryMid || !baseline || baseline <= 0) return 1.0;
  return clamp(userSalaryMid / baseline, 0.8, 1.3);
}

/**
 * 综合校正一条路径(per-path 因子:industry / ai / policy / cohort)
 * 不包含 personal_boost / offer_salary —— 这两项作用在用户起点,不属于 per-path。
 */
export function correctPath(path: SeniorPath, currentYear = CURRENT_YEAR): CorrectPathOutput {
  const base = baseScore(path);
  const ind = industryFactor(path.first_industry, path.start_year, currentYear);
  const ai = aiFactor(path.first_position_category);
  const pol = policyFactor(path.first_industry, path.start_year);
  const coh = cohortFactor(path.first_industry, path.start_year, currentYear);

  const corrected = clamp(base * ind * ai.factor * pol.factor * coh, 0, 100);

  return {
    original: round1(base),
    corrected: round1(corrected),
    factors: {
      industry: round2(ind),
      ai_risk: round2(ai.risk),
      policy_events: pol.events,
      policy_factor: round2(pol.factor),
      cohort: round2(coh),
    },
    explanation: generateExplanation(ind, ai.risk, pol.events, coh),
  };
}

/**
 * 把因子翻译成"人话"。新增 cohort + 可选 personal_boost / offer_salary 描述。
 */
export function generateExplanation(
  industry: number,
  aiRisk: number,
  events: string[],
  cohort = 1.0,
  personalBoost = 1.0,
  offerSalary = 1.0,
): string {
  const parts: string[] = [];
  if (industry < 0.7) parts.push(`所在行业现在比 5 年前明显降温(景气度 ${(industry * 100).toFixed(0)}%)`);
  else if (industry > 1.1) parts.push(`行业现在比 5 年前更景气(景气度 ${(industry * 100).toFixed(0)}%)`);
  if (aiRisk >= 0.6) parts.push(`AI 对该岗位有较高替代风险(${(aiRisk * 100).toFixed(0)}%)`);
  if (events.length) parts.push(`经历过外生事件:${events.join('、')}`);
  if (cohort < 0.85) {
    parts.push(`同岗位校招供需,你 2026 入场时比师兄当年明显更紧张(仅为当年的 ${(cohort * 100).toFixed(0)}%),同样的努力更难复制他的结果`);
  } else if (cohort > 1.15) {
    parts.push(`同岗位校招供需,你 2026 入场时比师兄当年更宽松(达当年的 ${(cohort * 100).toFixed(0)}%),这条赛道近年才打开`);
  }
  if (personalBoost > 1.05) {
    parts.push(`你的学校 / 学历 / GPA / 实习起点不错,加成 ${((personalBoost - 1) * 100).toFixed(0)}%`);
  } else if (personalBoost < 0.97) {
    parts.push(`起点维度有 ${((1 - personalBoost) * 100).toFixed(0)}% 的折扣空间需要后续追赶`);
  }
  if (offerSalary > 1.15) {
    parts.push(`你的 Offer 起薪高于同岗位中位 ${((offerSalary - 1) * 100).toFixed(0)}%,起点有优势`);
  } else if (offerSalary < 0.9) {
    parts.push(`你的 Offer 起薪比同岗位中位低 ${((1 - offerSalary) * 100).toFixed(0)}%`);
  }
  if (!parts.length) parts.push('行业环境与岗位特征相对稳定,校正幅度有限');
  return parts.join('。') + '。';
}

function round1(x: number) {
  return Math.round(x * 10) / 10;
}
function round2(x: number) {
  return Math.round(x * 100) / 100;
}

// 留个 export 给测试 / 外部调用
export { round1 as _round1, round2 as _round2 };