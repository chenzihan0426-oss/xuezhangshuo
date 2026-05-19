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
import { correctPath, generateExplanation } from './correction-engine';
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

  // 1) 拉候选(SQL 强约束)
  let candidates = await fetchCandidates(sb, input.offer);
  if (candidates.length < MATCH_LIMITS.MIN_CANDIDATES_BEFORE_RELAX) {
    candidates = await fetchCandidatesRelaxed(sb, input.offer);
  }

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

  // 5) 推断 offer 所在行业(从候选 same 组里最多的)
  const offerIndustry = inferIndustry(sameTop) ?? 'internet';

  // 6) 环境校正(基于 same 组中"同 offer 行业"的代表样本)
  //    避免把不同行业(地产/教培)的政策事件错误聚合到一个互联网 offer 上
  const sameIndustryPaths = sameTop.filter((p) => p.first_industry === offerIndustry);
  const repPaths = sameIndustryPaths.length >= 5 ? sameIndustryPaths.slice(0, 50) : sameTop.slice(0, 50);
  const corrections = repPaths.map((p) => correctPath(p, input.currentYear));
  const avgCorrected = corrections.length ? mean(corrections.map((c) => c.corrected)) : 0;
  const avgOriginal = corrections.length ? mean(corrections.map((c) => c.original)) : 0;
  // policy_events 只取与 offer 行业相关的(同样,从 corrections 里挑)
  const policyEventsForOfferIndustry = Array.from(
    new Set(
      corrections
        .filter((_, i) => repPaths[i].first_industry === offerIndustry)
        .flatMap((c) => c.factors.policy_events),
    ),
  );
  const aggregatedFactors = {
    industry: mean(corrections.map((c) => c.factors.industry)),
    ai_risk: mean(corrections.map((c) => c.factors.ai_risk)),
    policy_events: policyEventsForOfferIndustry,
  };

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
      },
      explanation: generateExplanation(
        aggregatedFactors.industry,
        aggregatedFactors.ai_risk,
        aggregatedFactors.policy_events,
      ),
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

async function fetchCandidates(sb: SupabaseSvc, offer: UserOffer): Promise<SeniorPath[]> {
  const levels = adjacentLevels(offer.level);
  // 优先用 company_id 精确匹配(字典内公司)
  if (offer.company_id) {
    const { data, error } = await sb
      .from('senior_paths')
      .select(CANDIDATE_COLUMNS)
      .eq('first_company_id', offer.company_id)
      .eq('first_position_category', offer.position_category)
      .in('first_level', levels)
      .gte('k_anonymity', MATCH_LIMITS.MIN_K_ANONYMITY)
      .limit(MATCH_LIMITS.CANDIDATE_HARD_LIMIT);
    if (error) throw error;
    if ((data ?? []).length >= MATCH_LIMITS.MIN_CANDIDATES_BEFORE_RELAX) {
      return data as unknown as SeniorPath[];
    }
  }
  // 没有 company_id(用户手填),或样本不够 → 用 company_tier 兜底
  if (offer.company_tier) {
    const { data, error } = await sb
      .from('senior_paths')
      .select(CANDIDATE_COLUMNS)
      .eq('first_company_tier', offer.company_tier)
      .eq('first_position_category', offer.position_category)
      .in('first_level', levels)
      .gte('k_anonymity', MATCH_LIMITS.MIN_K_ANONYMITY)
      .limit(MATCH_LIMITS.CANDIDATE_HARD_LIMIT);
    if (error) throw error;
    return (data ?? []) as unknown as SeniorPath[];
  }
  // 兜底:只按岗位类目 + 职级
  const { data, error } = await sb
    .from('senior_paths')
    .select(CANDIDATE_COLUMNS)
    .eq('first_position_category', offer.position_category)
    .in('first_level', levels)
    .gte('k_anonymity', MATCH_LIMITS.MIN_K_ANONYMITY)
    .limit(MATCH_LIMITS.CANDIDATE_HARD_LIMIT);
  if (error) throw error;
  return (data ?? []) as unknown as SeniorPath[];
}

async function fetchCandidatesRelaxed(sb: SupabaseSvc, offer: UserOffer): Promise<SeniorPath[]> {
  // 最宽松:只按岗位大类
  const { data, error } = await sb
    .from('senior_paths')
    .select(CANDIDATE_COLUMNS)
    .eq('first_position_category', offer.position_category)
    .gte('k_anonymity', MATCH_LIMITS.MIN_K_ANONYMITY)
    .limit(MATCH_LIMITS.CANDIDATE_HARD_LIMIT);
  if (error) throw error;
  return (data ?? []) as unknown as SeniorPath[];
}

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
