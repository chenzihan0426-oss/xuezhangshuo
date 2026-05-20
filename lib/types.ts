/**
 * 全局共享类型定义
 */

export type SchoolTier = 1 | 2 | 3 | 4 | 5; // 1=C9, 2=985非C9, 3=211非985, 4=普一本, 5=二本及以下
export type CompanyTier = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type EducationLevel = '本科' | '硕士' | '博士';
export type Level = 'intern' | 'graduate' | 'junior' | 'mid' | 'senior' | 'lead';
export type GpaBand = '<3.0' | '3.0-3.5' | '3.5+' | 'unknown';
export type MembershipTier = 'free' | 'paid_basic' | 'paid_pro';

export interface UserBackground {
  school_id: number;
  school_tier: SchoolTier;
  major_id: number;
  major_category: string;
  education_level: EducationLevel;
  graduation_year: number;
  gender?: string;
  gpa_band: GpaBand;
  internships?: UserInternship[];
}

export interface UserInternship {
  company_id: number;
  position_category: string;
  duration_months: number;
}

export interface UserOffer {
  id?: string;
  company_id: number;
  company_name?: string;
  /** 用户输入的公司类型(字典外公司必填),1-7 */
  company_tier?: number;
  /**
   * 该公司所属行业(用于 fetchCandidates L3 同行业匹配)。
   * - 字典内公司:fetchCompanies 自动带回填
   * - 字典外公司:用户必选,从 10 个已知行业 + 'other' 里挑
   *   选 'other' 表示行业不在我们覆盖范围,匹配会降级到 L4(同 tier+岗位,不限行业)
   */
  first_industry?: string;
  position_category: string;
  position_name?: string;
  level: Level;
  salary_min?: number;
  salary_max?: number;
  location?: string;
}

export interface SeniorPath {
  id: string;
  source: 'mock' | 'public' | 'zhilian';
  school_tier: SchoolTier;
  major_category: string;
  education_level?: EducationLevel;
  gender?: string;
  start_year: number;
  first_company_id?: number;
  first_company_tier?: CompanyTier;
  first_industry: string;
  first_position_category: string;
  first_level: Level;
  five_year_company_tier?: CompanyTier;
  five_year_industry?: string;
  five_year_level?: Level;
  five_year_salary?: number;
  job_changes: number;
  industry_changes: number;
  path_history?: PathHistoryEntry[];
  background_vec?: number[];
  is_anonymized: boolean;
  k_anonymity?: number;
  /** runtime-only */
  similarity?: number;
}

export interface PathHistoryEntry {
  year: number;
  company_tier: CompanyTier;
  industry: string;
  position: string;
  level: Level;
  salary?: number;
  /** 具体公司名(v1.1 起新增,演示用,基于同 tier 常见示例)*/
  company_name?: string;
  /** 具体岗位名(中文)*/
  position_name?: string;
}

export interface MatchGroup {
  count: number;
  paths: SeniorPath[]; // 已脱敏
  summary: GroupSummary;
}

export interface GroupSummary {
  avg_salary_5y: number;
  median_salary_5y: number;
  still_in_same_company_rate: number;
  avg_job_changes: number;
  avg_industry_changes: number;
  top_3_five_year_companies: { tier: CompanyTier; count: number }[];
  top_3_five_year_industries: { industry: string; count: number }[];
}

export interface OfferMatchResult {
  offer_id: string;
  offer_summary: string;
  groups: {
    same: MatchGroup;
    higher: MatchGroup;
    lower: MatchGroup;
  };
  correction: CorrectionResult;
}

export interface CorrectionResult {
  original_score: number;
  corrected_score: number;
  factors: {
    industry: number;
    ai_risk: number;
    policy_events: string[];
    /** 校招供需比 / 时代红利因子(>1 = 当年好机会,<1 = 内卷期) */
    cohort?: number;
    /** 用户起点加成(GPA + 实习 + 学校 + 学历 综合乘数) */
    personal_boost?: number;
    /** Offer 起薪 vs 同岗位中位 的比值因子,clamp [0.8, 1.3] */
    offer_salary?: number;
  };
  explanation: string;
  /** 同组样本容量(用于可信度 badge) */
  sample_size?: number;
  /** same 组中位 cosine 相似度(0-1)(用于可信度 badge) */
  avg_similarity?: number;
  /** 5 年后薪资分位:用于 P10-P90 区间带 */
  salary_p10?: number;
  salary_p50?: number;
  salary_p90?: number;
  /** same 组起薪中位(元/年),offerSalaryFactor 的对照基准 */
  salary_baseline?: number;
  /**
   * 匹配维度,告诉用户这次反推用的是哪种粒度的师兄数据。
   *   exact_company_position  - 同公司 + 同岗位(最精准)
   *   same_company_any_position - 同公司任意岗位(看公司的人 5 年后画像)
   *   same_tier_industry_position - 同 tier + 同行业 + 同岗位
   *   same_tier_position - 同 tier + 同岗位(放宽行业)
   *   position_only - 仅按岗位类目(回退,精准度最低)
   */
  match_level?:
    | 'exact_company_position'
    | 'same_company_any_position'
    | 'same_tier_industry_position'
    | 'same_tier_position'
    | 'position_only';
  /** matchOffer 推断出的 offer 行业,供 AI 联网简报使用 */
  offer_industry?: string;
  /** 用户真实院校档次(1-5),供前端分组基准 + 师兄列表按院校接近度排序 */
  user_school_tier?: number;
  /** AI 联网检索的公司/行业简报(异步生成后缓存于此) */
  ai_brief?: AiBrief;
}

/** AI 联网检索简报。AI 只解读联网到的真实信息,绝不影响校正分数。 */
export interface AiBrief {
  /** 是否检索到可靠信息 */
  found: boolean;
  /** 一句话总结 */
  summary: string;
  /** 关键事件,每条必须有真实来源 URL(白名单过滤后剩下的) */
  events: { title: string; date: string | null; source_url: string }[];
  /** 基于事件的谨慎职业展望解读(一句话) */
  career_outlook?: string;
  /**
   * AI 联网检索的市场参考薪资(该公司该岗位,万/年)。
   * 这是对 mock 师兄薪资的对照参考,前端会明确标注"AI 联网估算"。
   * 检索不到可靠数据时为 null。
   */
  salary_range?: {
    /** 应届起薪区间 */
    fresh_low: number;
    fresh_high: number;
    /** 工作约 5 年后区间 */
    senior_low: number;
    senior_high: number;
    /** 依据说明(数据来自哪类来源) */
    basis: string;
  } | null;
  /** 真实联网来源列表(取自通义 search_info) */
  sources?: { title: string; url: string; site_name?: string }[];
  /** 降级原因:无 key / 超时 / 失败 */
  degraded?: 'no_key' | 'timeout' | 'error';
  /** 生成时间(ISO),用于缓存判断 */
  generated_at?: string;
}

export interface MatchResponse {
  match_id: string;
  status: 'computing' | 'completed' | 'failed';
  results?: OfferMatchResult[];
  error?: string;
}

// 环境校正
export interface IndustryIndexMap {
  [industry: string]: { [year: number]: number };
}

export interface AiRiskMap {
  [positionCategory: string]: number;
}

export interface PolicyEvent {
  industry: string;
  year: number;
  impact: number;
  name: string;
}
