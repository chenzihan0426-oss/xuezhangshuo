/**
 * 双层匹配引擎(对应文档 §4.1)
 *
 * 第一层:Postgres SQL 强约束(first_company_id + position_category + level ±1)
 * 第二层:向量相似度排序 + 分三组(同/高/低背景)
 *
 * 纯函数 helpers(adjacentLevels / splitGroups)已挪到 ./match-helpers,
 * 客户端可直接 import 而不会拖出 server-only 依赖。
 */
import { MATCH_LIMITS } from './constants';
import type { MatchGroup, OfferMatchResult, SeniorPath, UserBackground, UserOffer } from './types';
import { backgroundToText, embedText } from './tongyi';
import { cosineSimilarity, mean, quantile, topNCounts } from './utils';
import { createSupabaseServiceClient } from './supabase-server';
import {
  correctPath,
  generateExplanation,
  offerSalaryFactor,
  personalBoostFactor,
} from './correction-engine';
import { adjacentLevels, splitGroups } from './match-helpers';

export { adjacentLevels, splitGroups };

type SupabaseSvc = ReturnType<typeof createSupabaseServiceClient>;

export interface MatchInput {
  background: UserBackground;
  offer: UserOffer & { id: string };
  currentYear?: number;
}

/**
 * 主入口:给定一个 offer + 用户背景,返回三组路径 + 环境校正
 */
export async function matchOffer(input: MatchInput, svc?: SupabaseSvc): Promise<OfferMatchResult> {
  const sb = svc ?? createSupabaseServiceClient();

  // 1) 拉候选(SQL 强约束)。5 层 fallback,**同公司是不可让步的 anchor**:
  //    用户问"入职 X 公司 5 年后",答案必须来自 X 公司起步的师兄。
  const fetched = await fetchCandidates(sb, input.offer);
  const candidates = fetched.paths;
  const matchLevel = fetched.match_level;

  // 2) 算用户 embedding,给候选打相似度
  const userVec = await embedText(
    backgroundToText({
      school_tier: input.background.school_tier,
      major_category: input.background.major_category,
      education_level: input.background.education_level,
      gpa_band: input.background.gpa_band,
      internships_count: input.background.internships?.length ?? 0,
      has_top_internship: hasTopInternship(input.background),
    }),
  );
  for (const c of candidates) {
    c.similarity = c.background_vec ? cosineSimilarity(c.background_vec, userVec) : 0;
  }

  // 3) 分组
  const { same, higher, lower } = splitGroups(candidates, input.background.school_tier);

  // 4) 取 Top N
  const topN = MATCH_LIMITS.TOP_N_PER_GROUP;
  const sameTop = same.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0)).slice(0, topN);
  const higherTop = higher.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0)).slice(0, topN);
  const lowerTop = lower.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0)).slice(0, topN);

  // 5) offer 所在行业:优先用户填的(与输出的 correction.offer_industry 同口径),
  //    否则从候选 same 组众数推断
  const offerIndustry =
    input.offer.first_industry && input.offer.first_industry !== 'other'
      ? input.offer.first_industry
      : inferIndustry(sameTop) ?? 'internet';

  // 6) 环境校正(基于 same 组中"同 offer 行业"的代表样本)
  //    避免把不同行业(地产/教培)的政策事件错误聚合到一个互联网 offer 上。
  //    same 为空(用户院校与候选集差 ≥2 档)时退回全体候选,否则 mean([]) 把校正分打成全 0
  const correctionPool = sameTop.length
    ? sameTop
    : [...higherTop, ...lowerTop]
        .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
        .slice(0, topN);
  const sameIndustryPaths = correctionPool.filter((p) => p.first_industry === offerIndustry);
  const repPaths =
    sameIndustryPaths.length >= 5 ? sameIndustryPaths.slice(0, 50) : correctionPool.slice(0, 50);
  const corrections = repPaths.map((p) => correctPath(p, input.currentYear));
  const avgCorrectedPath = corrections.length ? mean(corrections.map((c) => c.corrected)) : 0;
  const avgOriginal = corrections.length ? mean(corrections.map((c) => c.original)) : 0;
  // policy_events 只取与 offer 行业相关的(同样,从 corrections 里挑)
  const policyEventsForOfferIndustry = Array.from(
    new Set(
      corrections
        .filter((_, i) => repPaths[i].first_industry === offerIndustry)
        .flatMap((c) => c.factors.policy_events),
    ),
  );
  // corrections 为空时因子取乘性中性值 1(而不是 mean([])=0),避免"景气度 0%"假文案
  const aggregatedFactors = corrections.length
    ? {
        industry: mean(corrections.map((c) => c.factors.industry)),
        ai_risk: mean(corrections.map((c) => c.factors.ai_risk)),
        policy_events: policyEventsForOfferIndustry,
        policy_factor: mean(corrections.map((c) => c.factors.policy_factor ?? 1)),
        cohort: mean(corrections.map((c) => c.factors.cohort ?? 1)),
      }
    : { industry: 1, ai_risk: 0, policy_events: [] as string[], policy_factor: 1, cohort: 1 };

  // 7) 用户起点加成(S4 GPA/实习 + S5 学校/学历):作用在 user 上的乘数,不属于 per-path
  const personal = personalBoostFactor(input.background);

  // 8) Offer 薪资 vs 同岗位起薪基准(S3)
  //    salary_baseline 取 sameTop 里 path_history[0].salary 的中位数;
  //    没有 path_history 时退化用 first_company_tier 平均薪资估算(略),这里先按 50%-of-five-year 估算
  const startSalaries: number[] = [];
  for (const p of correctionPool) {
    if (Array.isArray(p.path_history) && p.path_history.length && p.path_history[0].salary) {
      startSalaries.push(p.path_history[0].salary);
    } else if (p.five_year_salary) {
      // 候选阶段已剥掉 path_history,用 5y 薪资保守反推 graduate 起薪
      startSalaries.push(Math.round(p.five_year_salary * 0.45));
    }
  }
  const salaryBaseline = startSalaries.length ? quantile(startSalaries, 0.5) : undefined;
  const userSalaryMid =
    input.offer.salary_min && input.offer.salary_max
      ? (input.offer.salary_min + input.offer.salary_max) / 2
      : input.offer.salary_min ?? input.offer.salary_max;
  const offerSalaryF = offerSalaryFactor(userSalaryMid, salaryBaseline);

  // 9) 把 personal_boost × offer_salary 作用在 avgCorrected 上
  const avgCorrected = Math.min(100, avgCorrectedPath * personal.factor * offerSalaryF);

  // 10) 可信度信号 + 5 年薪资分位(S1 + S7)—— 与校正样本同池(same 空时为回退池)
  const sampleSize = correctionPool.length;
  const simValues = correctionPool.map((p) => p.similarity ?? 0).filter((s) => s > 0);
  const avgSimilarity = simValues.length ? quantile(simValues, 0.5) : 0;
  const fiveYearSalaries = correctionPool.map((p) => p.five_year_salary ?? 0).filter((s) => s > 0);
  const salaryP10 = fiveYearSalaries.length ? Math.round(quantile(fiveYearSalaries, 0.1)) : 0;
  const salaryP50 = fiveYearSalaries.length ? Math.round(quantile(fiveYearSalaries, 0.5)) : 0;
  const salaryP90 = fiveYearSalaries.length ? Math.round(quantile(fiveYearSalaries, 0.9)) : 0;

  return {
    offer_id: input.offer.id,
    offer_summary: `${input.offer.company_name ?? '#' + input.offer.company_id} - ${input.offer.position_category} (${input.offer.level})`,
    groups: {
      same: summarizeGroup(sameTop),
      higher: summarizeGroup(higherTop),
      lower: summarizeGroup(lowerTop),
    },
    correction: {
      original_score: round1(avgOriginal),
      corrected_score: round1(avgCorrected),
      factors: {
        industry: round2(aggregatedFactors.industry),
        ai_risk: round2(aggregatedFactors.ai_risk),
        policy_events: aggregatedFactors.policy_events,
        policy_factor: round2(aggregatedFactors.policy_factor),
        cohort: round2(aggregatedFactors.cohort),
        personal_boost: round2(personal.factor),
        offer_salary: round2(offerSalaryF),
      },
      explanation: generateExplanation(
        aggregatedFactors.industry,
        aggregatedFactors.ai_risk,
        aggregatedFactors.policy_events,
        aggregatedFactors.cohort,
        personal.factor,
        offerSalaryF,
      ),
      sample_size: sampleSize,
      avg_similarity: round2(avgSimilarity),
      salary_p10: salaryP10,
      salary_p50: salaryP50,
      salary_p90: salaryP90,
      salary_baseline: salaryBaseline ? Math.round(salaryBaseline) : undefined,
      match_level: matchLevel,
      // offerIndustry 已优先用户填的行业(见步骤 5);供 AI 联网简报使用
      offer_industry: offerIndustry,
      // 用户真实院校档次:供前端"同/高/低"分组 + 列表按院校接近度排序
      user_school_tier: input.background.school_tier,
    },
  };
}

/* ============ helpers ============ */

// 匹配阶段只需要这些列。path_history(JSONB,几 KB)、source_metadata 等都不拉,
// 等 GET /api/match/[id] 按选中的 id 再去查全量字段,大幅降低单次查询的数据量。
const CANDIDATE_COLUMNS =
  'id, school_tier, start_year, first_company_id, first_company_tier, first_industry, ' +
  'first_position_category, first_level, five_year_company_tier, five_year_industry, ' +
  'five_year_level, five_year_salary, job_changes, industry_changes, background_vec';

type MatchLevel =
  | 'exact_company_position'
  | 'same_company_any_position'
  | 'same_tier_industry_position'
  | 'same_tier_position'
  | 'position_only';

interface FetchResult {
  paths: SeniorPath[];
  match_level: MatchLevel;
}

/**
 * 5 层 fallback。**同公司是不可让步的 anchor**:用户填了腾讯 PM,
 * 答案应该是"腾讯起步的人 5 年后画像",哪怕只有 10 条也比"100 个 PM 不管哪儿"更有意义。
 *
 * 阈值:
 *   L1 exact_company_position    ≥ 5  — 精准
 *   L2 same_company_any_position ≥ 5  — 同公司,放宽到任意岗位
 *   L3 same_tier_industry_position ≥ 20 — 字典外/创业公司退到 tier+行业+岗位
 *   L4 same_tier_position        ≥ 10 — 放宽行业
 *   L5 position_only             兜底
 */
async function fetchCandidates(sb: SupabaseSvc, offer: UserOffer): Promise<FetchResult> {
  const levels = adjacentLevels(offer.level);
  const limit = MATCH_LIMITS.CANDIDATE_HARD_LIMIT;
  const minK = MATCH_LIMITS.MIN_K_ANONYMITY;

  // L1: 同公司 + 同岗位
  if (offer.company_id) {
    const { data } = await sb
      .from('senior_paths')
      .select(CANDIDATE_COLUMNS)
      .eq('first_company_id', offer.company_id)
      .eq('first_position_category', offer.position_category)
      .in('first_level', levels)
      .gte('k_anonymity', minK)
      .limit(limit);
    if ((data ?? []).length >= 5) {
      return { paths: data as unknown as SeniorPath[], match_level: 'exact_company_position' };
    }
  }

  // L2: 同公司任意岗位(同公司是 anchor,放宽岗位)
  if (offer.company_id) {
    const { data } = await sb
      .from('senior_paths')
      .select(CANDIDATE_COLUMNS)
      .eq('first_company_id', offer.company_id)
      .in('first_level', levels)
      .gte('k_anonymity', minK)
      .limit(limit);
    if ((data ?? []).length >= 5) {
      return { paths: data as unknown as SeniorPath[], match_level: 'same_company_any_position' };
    }
  }

  // 从这层起没有 company_id 约束(字典外公司或样本极少)。
  // 优先用用户填的 first_industry(字典内自动带回,字典外用户必选)。
  // 选 'other' 或没填时,fallback 到岗位推断;但精度差,只能进 L4。
  const userIndustry = offer.first_industry && offer.first_industry !== 'other' ? offer.first_industry : null;

  // L3: 同 tier + 同行业 + 同岗位
  if (offer.company_tier && userIndustry) {
    const { data } = await sb
      .from('senior_paths')
      .select(CANDIDATE_COLUMNS)
      .eq('first_company_tier', offer.company_tier)
      .eq('first_industry', userIndustry)
      .eq('first_position_category', offer.position_category)
      .in('first_level', levels)
      .gte('k_anonymity', minK)
      .limit(limit);
    if ((data ?? []).length >= 20) {
      return { paths: data as unknown as SeniorPath[], match_level: 'same_tier_industry_position' };
    }
  }

  // L4: 同 tier + 同岗位(放宽行业)
  if (offer.company_tier) {
    const { data } = await sb
      .from('senior_paths')
      .select(CANDIDATE_COLUMNS)
      .eq('first_company_tier', offer.company_tier)
      .eq('first_position_category', offer.position_category)
      .in('first_level', levels)
      .gte('k_anonymity', minK)
      .limit(limit);
    if ((data ?? []).length >= 10) {
      return { paths: data as unknown as SeniorPath[], match_level: 'same_tier_position' };
    }
  }

  // L5: 兜底 - 仅同岗位类目
  const { data } = await sb
    .from('senior_paths')
    .select(CANDIDATE_COLUMNS)
    .eq('first_position_category', offer.position_category)
    .in('first_level', levels)
    .gte('k_anonymity', minK)
    .limit(limit);
  return { paths: (data ?? []) as unknown as SeniorPath[], match_level: 'position_only' };
}

// 备注:之前有个 inferIndustryFromPosition() 写死「PM → internet」的兜底,
// 导致用户填星巴克(零售)时被错误匹配到互联网 PM。已移除,改由用户在
// offer 表单显式选行业(字典内自动带,字典外必选)。

function summarizeGroup(paths: SeniorPath[]): MatchGroup {
  if (!paths.length) {
    return {
      count: 0,
      paths: [],
      summary: {
        avg_salary_5y: 0,
        median_salary_5y: 0,
        still_in_same_company_rate: 0,
        avg_job_changes: 0,
        avg_industry_changes: 0,
        top_3_five_year_companies: [],
        top_3_five_year_industries: [],
      },
    };
  }

  const salaries = paths.map((p) => p.five_year_salary ?? 0).filter((s) => s > 0);
  const sameCompanyCount = paths.filter(
    (p) => p.first_company_tier !== undefined && p.first_company_tier === p.five_year_company_tier,
  ).length;

  return {
    count: paths.length,
    paths: paths.slice(0, 50).map(anonymize),
    summary: {
      avg_salary_5y: Math.round(mean(salaries)),
      median_salary_5y: Math.round(quantile(salaries, 0.5)),
      still_in_same_company_rate: paths.length ? sameCompanyCount / paths.length : 0,
      avg_job_changes: round1(mean(paths.map((p) => p.job_changes))),
      avg_industry_changes: round1(mean(paths.map((p) => p.industry_changes))),
      top_3_five_year_companies: topNCounts(paths, (p) => p.five_year_company_tier ?? 0).map((x) => ({
        tier: x.key as never,
        count: x.count,
      })),
      top_3_five_year_industries: topNCounts(paths, (p) => p.five_year_industry ?? 'unknown').map((x) => ({
        industry: String(x.key),
        count: x.count,
      })),
    },
  };
}

function anonymize(p: SeniorPath): SeniorPath {
  // 去掉 vector / 任何可能反向识别的字段
  const { background_vec, ...rest } = p;
  void background_vec;
  return rest as SeniorPath;
}

function hasTopInternship(bg: UserBackground): boolean {
  return (bg.internships ?? []).some((i) => i.duration_months >= 3);
}

/** 候选集中最多的 first_industry,作为 offer 实际行业的代理 */
function inferIndustry(paths: SeniorPath[]): string | undefined {
  if (!paths.length) return undefined;
  const counter = new Map<string, number>();
  for (const p of paths) counter.set(p.first_industry, (counter.get(p.first_industry) ?? 0) + 1);
  return [...counter.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function round1(x: number) {
  return Math.round(x * 10) / 10;
}
function round2(x: number) {
  return Math.round(x * 100) / 100;
}
