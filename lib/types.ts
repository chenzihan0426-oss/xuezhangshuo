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
  };
  explanation: string;
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
