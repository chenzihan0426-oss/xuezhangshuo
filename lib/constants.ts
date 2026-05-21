/**
 * 全局常量配置
 * 校正因子的"运行时缓存版本",供算法直接使用。
 * 真正的数据源是 `environment_factors` 表,通过 seed_environment_factors.py 写入,
 * 服务端启动时从 DB 加载并替换以下默认值。
 */

import type { AiRiskMap, IndustryIndexMap, PolicyEvent } from './types';

export const SCHOOL_TIER_LABELS: Record<number, string> = {
  1: 'C9',
  2: '985 非 C9',
  3: '211 非 985',
  4: '普通一本',
  5: '二本及以下',
};

/**
 * 各院校层级的代表院校(取自 schools 字典,演示用)。
 * 师兄路径出于 k-匿名脱敏只存 school_tier,这里按层级分配一个真实代表院校名展示,
 * 做法与"公司名按公司层级分配代表示例"一致 —— 不是声称某个真实个人来自该校。
 */
export const SCHOOL_NAMES_BY_TIER: Record<number, string[]> = {
  1: ['清华大学', '北京大学', '复旦大学', '上海交通大学', '浙江大学', '南京大学', '中国科学技术大学', '哈尔滨工业大学', '西安交通大学'],
  2: ['武汉大学', '华中科技大学', '中山大学', '北京师范大学', '同济大学', '北京航空航天大学', '四川大学'],
  3: ['苏州大学', '郑州大学', '暨南大学', '西南大学', '南昌大学'],
  4: ['上海大学', '浙江工业大学', '华南农业大学', '江苏大学', '长沙理工大学'],
  5: ['广州大学', '广东工业大学', '武汉工程大学', '重庆工商大学', '湖北经济学院'],
};

/** 简单稳定 hash(同一 path 永远落到同一个学校,不依赖 crypto,前端可用) */
function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** 按 path id + 院校层级,确定性分配一个该层级的代表院校名 */
export function schoolNameFor(pathId: string, tier: number | undefined): string {
  const pool = SCHOOL_NAMES_BY_TIER[tier ?? 0];
  if (!pool || !pool.length) return SCHOOL_TIER_LABELS[tier ?? 0] ?? '院校';
  return pool[stableHash(pathId) % pool.length];
}

export const COMPANY_TIER_LABELS: Record<number, string> = {
  1: '一线大厂',
  2: '独角兽',
  3: '普通互联网',
  4: '传统企业',
  5: '国企',
  6: '政府',
  7: '创业公司',
};

export const LEVEL_ORDER: Record<string, number> = {
  intern: 0,
  graduate: 1,
  junior: 2,
  mid: 3,
  senior: 4,
  lead: 5,
};

export const LEVEL_LABELS: Record<string, string> = {
  intern: '实习',
  graduate: '应届',
  junior: '初级',
  mid: '中级',
  senior: '高级',
  lead: 'Lead',
};

/** 行业景气指数(单位 1.0 = 2020 基准年) */
export const INDUSTRY_INDEX: IndustryIndexMap = {
  internet:           { 2020: 1.0, 2021: 1.1,  2022: 0.7,  2023: 0.5,  2024: 0.6,  2025: 0.65, 2026: 0.7 },
  finance:            { 2020: 1.0, 2021: 1.0,  2022: 0.95, 2023: 0.9,  2024: 0.85, 2025: 0.85, 2026: 0.85 },
  education_training: { 2020: 1.0, 2021: 0.3,  2022: 0.15, 2023: 0.15, 2024: 0.2,  2025: 0.25, 2026: 0.3 },
  real_estate:        { 2020: 1.0, 2021: 0.9,  2022: 0.4,  2023: 0.3,  2024: 0.3,  2025: 0.35, 2026: 0.4 },
  auto_ev:            { 2020: 0.8, 2021: 1.2,  2022: 1.3,  2023: 1.25, 2024: 1.1,  2025: 1.0,  2026: 0.95 },
  tech_hardware:      { 2020: 1.0, 2021: 1.05, 2022: 1.0,  2023: 1.1,  2024: 1.15, 2025: 1.2,  2026: 1.2 },
  telecom:            { 2020: 1.0, 2021: 1.0,  2022: 1.0,  2023: 1.0,  2024: 1.0,  2025: 1.0,  2026: 1.0 },
  energy:             { 2020: 1.0, 2021: 1.0,  2022: 1.05, 2023: 1.1,  2024: 1.1,  2025: 1.1,  2026: 1.1 },
  consulting:         { 2020: 1.0, 2021: 1.05, 2022: 1.0,  2023: 0.95, 2024: 0.9,  2025: 0.9,  2026: 0.9 },
  startup:            { 2020: 1.0, 2021: 1.2,  2022: 0.8,  2023: 0.6,  2024: 0.7,  2025: 0.75, 2026: 0.8 },
  // 消费服务 / 连锁零售 / 餐饮:2020-2022 受疫情打击,2023+ 恢复但消费降级影响
  consumer_service:   { 2020: 1.0, 2021: 0.75, 2022: 0.6,  2023: 0.85, 2024: 0.9,  2025: 0.9,  2026: 0.92 },
};

/** AI 5 年替代风险(0-1,越大风险越高) */
export const AI_RISK_TABLE: AiRiskMap = {
  content_operation:   0.70,
  data_analyst:        0.60,
  customer_service:    0.85,
  translation:         0.80,
  engineer_backend:    0.30,
  engineer_frontend:   0.40,
  engineer_algorithm:  0.20,
  engineer_data:       0.35,
  product_manager:     0.40,
  product_designer:    0.45,
  ui_designer:         0.55,
  marketing:           0.50,
  sales_b2b:           0.25,
  sales_b2c:           0.40,
  hr:                  0.45,
  finance_analyst:     0.55,
  investment_analyst:  0.40,
  consultant:          0.35,
  teacher_k12:         0.25,
  civil_servant:       0.10,
  user_operation:      0.55,
};

/** 政策事件遮罩 */
export const POLICY_EVENTS: PolicyEvent[] = [
  { industry: 'education_training', year: 2021, impact: 0.3, name: '双减政策' },
  { industry: 'real_estate',        year: 2022, impact: 0.5, name: '三道红线 + 爆雷潮' },
  { industry: 'internet',           year: 2023, impact: 0.7, name: '互联网大裁员' },
  { industry: 'real_estate',        year: 2024, impact: 0.85, name: '保交楼,需求未恢复' },
];

/**
 * 校招供需比 / 时代红利因子(>1 = 当年好机会,<1 = 内卷期)
 * 数据基线:互联网 2020 ≈ 1.0,后续逐年走低反映"机会变窄";
 * 教培 2021 双减后断崖;新能源/硬件逐年走高反映风口。
 * 用法:cohortFactor 取 path.start_year 对应行业的值,直接乘进 corrected。
 */
export const COHORT_INDEX: IndustryIndexMap = {
  internet:           { 2018: 1.20, 2019: 1.15, 2020: 1.10, 2021: 1.05, 2022: 0.85, 2023: 0.70, 2024: 0.65, 2025: 0.70, 2026: 0.72 },
  finance:            { 2018: 1.05, 2019: 1.05, 2020: 1.00, 2021: 1.00, 2022: 0.95, 2023: 0.90, 2024: 0.85, 2025: 0.85, 2026: 0.85 },
  education_training: { 2018: 1.10, 2019: 1.15, 2020: 1.15, 2021: 0.50, 2022: 0.25, 2023: 0.25, 2024: 0.30, 2025: 0.35, 2026: 0.35 },
  real_estate:        { 2018: 1.10, 2019: 1.05, 2020: 1.00, 2021: 0.90, 2022: 0.55, 2023: 0.40, 2024: 0.40, 2025: 0.45, 2026: 0.50 },
  auto_ev:            { 2018: 0.85, 2019: 0.90, 2020: 0.95, 2021: 1.15, 2022: 1.25, 2023: 1.20, 2024: 1.10, 2025: 1.00, 2026: 0.95 },
  tech_hardware:      { 2018: 0.95, 2019: 0.95, 2020: 1.00, 2021: 1.05, 2022: 1.05, 2023: 1.10, 2024: 1.15, 2025: 1.15, 2026: 1.15 },
  telecom:            { 2018: 1.00, 2019: 1.00, 2020: 1.00, 2021: 1.00, 2022: 1.00, 2023: 1.00, 2024: 1.00, 2025: 1.00, 2026: 1.00 },
  energy:             { 2018: 0.95, 2019: 0.95, 2020: 1.00, 2021: 1.00, 2022: 1.05, 2023: 1.10, 2024: 1.10, 2025: 1.10, 2026: 1.10 },
  consulting:         { 2018: 1.05, 2019: 1.05, 2020: 1.05, 2021: 1.05, 2022: 1.00, 2023: 0.95, 2024: 0.90, 2025: 0.90, 2026: 0.90 },
  startup:            { 2018: 1.10, 2019: 1.15, 2020: 1.15, 2021: 1.20, 2022: 0.85, 2023: 0.65, 2024: 0.70, 2025: 0.75, 2026: 0.80 },
  consumer_service:   { 2018: 1.05, 2019: 1.10, 2020: 1.00, 2021: 0.75, 2022: 0.65, 2023: 0.90, 2024: 0.95, 2025: 1.00, 2026: 1.00 },
};

/**
 * 个人起点加成 — 用于 personalBoostFactor。
 * 不同维度独立相乘。所有值都 clamp 到 [0.95, 1.10] 范围内,避免出现极端分。
 *
 * 注意:这是基于历史数据的"起点观察",不代表能力评价。UI 上必须明示免责。
 */
export const SCHOOL_TIER_MULTIPLIER: Record<number, number> = {
  1: 1.10, // C9
  2: 1.05, // 985 非 C9
  3: 1.02, // 211 非 985
  4: 1.00, // 普一本
  5: 0.97, // 二本及以下
};

export const EDU_LEVEL_MULTIPLIER: Record<string, number> = {
  本科: 1.00,
  硕士: 1.03,
  博士: 1.08,
};

export const GPA_BAND_MULTIPLIER: Record<string, number> = {
  '3.5+': 1.04,
  '3.0-3.5': 1.00,
  '<3.0': 0.97,
  unknown: 1.00,
};

/** 实习经历加成 */
export const INTERNSHIP_MULTIPLIER = {
  none: 1.00,        // 0 段
  some: 1.02,        // 1+ 段
  top: 1.05,         // 有 ≥3 个月长实习
};

/** 个人起点加成总开关。关闭时 personalBoostFactor 永远返回 1.0(不影响分数) */
export const ENABLE_BACKGROUND_PREMIUM = true;

/** 匹配相关的硬阈值 */
export const MATCH_LIMITS = {
  CANDIDATE_HARD_LIMIT: 1500,
  MIN_CANDIDATES_BEFORE_RELAX: 100,
  TOP_N_PER_GROUP: 100,
  MIN_K_ANONYMITY: 1000,
};

/** 付费/会员策略 */
export const PAYWALL = {
  FREE_MATCHES_PER_DAY: 1,
  /** 免费用户能看到的师兄路径数;付费解锁全部 */
  FREE_PATHS_VISIBLE: 20,
  PAID_PATHS_VISIBLE: 200,
};

export const VECTOR_DIM = 128;
export const CURRENT_YEAR = 2026;

/**
 * 因子来源与算法口径(供 UI「这个分数怎么算出来的」展示)。
 * 每个数值都必须能追溯到这里 —— 评委/用户可逐项核对,不是黑盒。
 * V1 演示版的指数表由 seed_environment_factors.py 按以下公开来源标定后写入
 * environment_factors 表;正式版接入智联真实合作数据后按同口径重算。
 */
export interface FactorSource {
  /** 这个因子衡量什么 */
  what: string;
  /** 数据来源(可追溯的公开口径) */
  source: string;
  /** 怎么算成这个乘数的 */
  method: string;
}

export const FACTOR_SOURCES: Record<
  'industry' | 'ai_risk' | 'policy' | 'cohort' | 'personal' | 'offer_salary',
  FactorSource
> = {
  industry: {
    what: '行业现在比师兄起步时景气多少',
    source: '国家统计局分行业增加值/营收增速 + 智联《中国企业招聘薪酬报告》行业景气,以 2020 年为基准 1.0 归一',
    method: '当前年指数 ÷ 师兄起步年指数(同行业时间序列见 INDUSTRY_INDEX)',
  },
  ai_risk: {
    what: '未来 5 年 AI 对该岗位的可替代概率',
    source: '麦肯锡《生成式 AI 的经济潜力》、宾大/OpenAI《GPTs are GPTs》岗位暴露度研究,映射到岗位类目',
    method: '替代风险 r∈[0,1] → 乘数 = 1 − r×0.3,限幅 [0.70, 1.00](风险越高,折扣越多)',
  },
  policy: {
    what: '师兄起步后才发生的政策/行业外生冲击',
    source: '公开政策文件与行业事件:双减(2021)、地产三道红线(2022)、互联网整改裁员(2023)等',
    method: '只叠乘「在该师兄起步年之后」发生且同行业的事件影响系数(见 POLICY_EVENTS)',
  },
  cohort: {
    what: '你 2026 入场 vs 师兄当年入场的校招机会窗口',
    source: '教育部高校毕业生规模 + 智联校招岗位供需比,反映入场年份的机会宽窄',
    method: '你入场年供需指数 ÷ 师兄入场年供需指数,限幅 [0.5, 1.5](见 COHORT_INDEX)',
  },
  personal: {
    what: '你的院校/学历/GPA/实习起点',
    source: '历史样本中 院校层级 × 学历 × GPA × 实习 与 5 年薪资的相关性观察',
    method: '四维各自乘数连乘后限幅 [0.85, 1.30];是统计相关,不代表对个人能力的评价',
  },
  offer_salary: {
    what: '你的 Offer 起薪相对同岗位的位置',
    source: '同岗位、同档次师兄的起薪中位数(本次匹配样本内计算)',
    method: '你的 Offer 起薪 ÷ 同岗位师兄起薪中位,限幅 [0.80, 1.30]',
  },
};
