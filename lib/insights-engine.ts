/**
 * 规则自动总结引擎(对应 M5 新增「你需要警惕的 N 件事」面板)
 *
 * 纯函数:输入 paths + correction,输出 1-5 条 actionable insights。
 * 完全规则化,不依赖 LLM,保证可解释、可复现。
 */
import { AI_RISK_TABLE, COMPANY_TIER_LABELS, INDUSTRY_INDEX, LEVEL_ORDER } from './constants';
import type { CorrectionResult, SeniorPath } from './types';
import { mean, quantile } from './utils';

export type InsightLevel = 'info' | 'warn' | 'danger';

export interface Insight {
  level: InsightLevel;
  title: string;
  detail: string;
  /** 用于排序:数字越大越靠前 */
  weight: number;
  /** 内部 id,供 UI key */
  id: string;
}

export function generateInsights(opts: {
  paths: SeniorPath[];
  correction?: CorrectionResult;
  offerIndustry?: string;
  offerPositionCategory?: string;
  /** 薪资缩放系数(对齐 AI 市场量级);只影响绝对薪资判断,不影响比例类规则 */
  salaryScale?: number;
}): Insight[] {
  const { paths, correction, offerIndustry, offerPositionCategory, salaryScale = 1 } = opts;
  const insights: Insight[] = [];
  if (!paths.length) {
    insights.push({
      id: 'no-data',
      level: 'warn',
      title: '样本太少',
      detail: '当前筛选条件下匹配的师兄不足以给出可靠结论,建议放宽筛选。',
      weight: 100,
    });
    return insights;
  }

  // 1) 早跳率
  const earlyJump = paths.filter((p) => p.job_changes >= 1 && firstYearJump(p)).length;
  const earlyRate = earlyJump / paths.length;
  if (earlyRate >= 0.15) {
    insights.push({
      id: 'early-jump',
      level: earlyRate >= 0.3 ? 'danger' : 'warn',
      title: `${(earlyRate * 100).toFixed(0)}% 的师兄 1 年内就跳走了`,
      detail: pickReason(paths, offerIndustry) ?? '具体原因建议在面试时主动询问 HR 或现员工。',
      weight: 90 + earlyRate * 100,
    });
  }

  // 2) 升迁速度
  const promoYears = paths.map(yearsToSenior).filter((y): y is number => y !== null);
  if (promoYears.length >= 10) {
    const medianY = quantile(promoYears, 0.5);
    if (medianY >= 4) {
      insights.push({
        id: 'slow-promo',
        level: 'warn',
        title: `升到 senior 平均要 ${medianY.toFixed(1)} 年`,
        detail: `中位数 ${medianY.toFixed(1)} 年,比互联网行业典型节奏(3 年)慢,可能跟岗位 / 公司晋升通道有关。`,
        weight: 75 + (medianY - 3) * 5,
      });
    } else if (medianY <= 2.5) {
      insights.push({
        id: 'fast-promo',
        level: 'info',
        title: `升迁较快:中位 ${medianY.toFixed(1)} 年`,
        detail: '该岗位的晋升通道相对畅通,但要看你能否拿到代表性项目。',
        weight: 40,
      });
    }
  }

  // 3) 转行率
  const switched = paths.filter((p) => p.industry_changes >= 1).length;
  const switchRate = switched / paths.length;
  if (switchRate >= 0.25) {
    insights.push({
      id: 'industry-switch',
      level: switchRate >= 0.5 ? 'danger' : 'warn',
      title: `${(switchRate * 100).toFixed(0)}% 的师兄 5 年内换了行业`,
      detail: dominantSwitchTarget(paths) ?? '注意:这条路径的可持续性可能比看起来要差。',
      weight: 80 + switchRate * 40,
    });
  }

  // 4) 行业景气度
  if (offerIndustry && INDUSTRY_INDEX[offerIndustry]) {
    const series = INDUSTRY_INDEX[offerIndustry];
    const currentYear = Math.max(...Object.keys(series).map(Number));
    const cur = series[currentYear];
    const prev3y = series[currentYear - 3] ?? cur;
    const trend = cur - prev3y;
    if (cur <= 0.65) {
      insights.push({
        id: 'industry-down',
        level: 'danger',
        title: `${labelIndustry(offerIndustry)} 行业仍处于低位(景气度 ${(cur * 100).toFixed(0)}%)`,
        detail:
          trend < 0
            ? '行业过去 3 年仍在下滑,要做好"5 年后这个 offer 已经不再吃香"的预期。'
            : '已经触底,但何时回到 5 年前的水平不确定。',
        weight: 95,
      });
    } else if (cur >= 1.1) {
      insights.push({
        id: 'industry-up',
        level: 'info',
        title: `${labelIndustry(offerIndustry)} 行业景气度 ${(cur * 100).toFixed(0)}%`,
        detail: '正向赛道,但留意是否处于周期高点。',
        weight: 30,
      });
    }
  }

  // 5) AI 替代风险
  if (offerPositionCategory) {
    const risk = AI_RISK_TABLE[offerPositionCategory];
    if (risk !== undefined && risk >= 0.55) {
      insights.push({
        id: 'ai-risk',
        level: risk >= 0.7 ? 'danger' : 'warn',
        title: `该岗位 AI 替代风险评估 ${(risk * 100).toFixed(0)}%`,
        detail:
          '建议把"用 AI 提效"作为入职后第一年的核心目标,避免做容易被批量替代的工作。',
        weight: 85 + risk * 30,
      });
    }
  }

  // 6) 留在原公司比例
  const stayed = paths.filter(
    (p) => p.first_company_tier !== undefined && p.first_company_tier === p.five_year_company_tier,
  ).length;
  const stayRate = stayed / paths.length;
  if (paths.length >= 30 && stayRate <= 0.15) {
    insights.push({
      id: 'low-stay',
      level: 'warn',
      title: `只有 ${(stayRate * 100).toFixed(0)}% 的师兄 5 年后还在同 tier 公司`,
      detail: '这意味着这条路径"用脚投票"的人很多,值得探一下原因(业务波动?升通道窄?)',
      weight: 70,
    });
  }

  // 7) 校正后明显跌分
  if (correction && correction.original_score - correction.corrected_score >= 15) {
    insights.push({
      id: 'correction-drop',
      level: 'danger',
      title: `环境校正后,这个 offer 实际分数下降 ${(correction.original_score - correction.corrected_score).toFixed(1)} 分`,
      detail: correction.explanation,
      weight: 92,
    });
  }

  // 8) 中位薪资低于行业基线(用 salaryScale 对齐 AI 市场量级,跟展示一致)
  const salaries = paths.map((p) => (p.five_year_salary ?? 0) * salaryScale).filter((s) => s > 0);
  if (salaries.length >= 20) {
    const med = quantile(salaries, 0.5);
    if (med <= 150_000) {
      insights.push({
        id: 'low-salary',
        level: 'warn',
        title: `5 年后中位年薪只有 ${(med / 10_000).toFixed(1)} 万`,
        detail: '比互联网应届 → 5 年 mid 的典型水平(25-35 万)低,要么晋升慢,要么基薪偏低。',
        weight: 78,
      });
    }
  }

  // 9) 性别差异(数据中可观察的薪资差)
  const maleSalaries = paths.filter((p) => p.gender === 'male').map((p) => p.five_year_salary ?? 0).filter((s) => s > 0);
  const femaleSalaries = paths.filter((p) => p.gender === 'female').map((p) => p.five_year_salary ?? 0).filter((s) => s > 0);
  if (maleSalaries.length >= 10 && femaleSalaries.length >= 10) {
    const mMed = quantile(maleSalaries, 0.5);
    const fMed = quantile(femaleSalaries, 0.5);
    const gap = (mMed - fMed) / mMed;
    if (Math.abs(gap) >= 0.15) {
      const direction = gap > 0 ? '男 > 女' : '女 > 男';
      insights.push({
        id: 'gender-gap',
        level: 'info',
        title: `数据中存在 ${(Math.abs(gap) * 100).toFixed(0)}% 的性别薪资差(${direction})`,
        detail: '不一定是岗位本身,可能跟入职年份 / 路径选择有关。仅作为参考。',
        weight: 35,
      });
    }
  }

  // 10) 薪资增速(从第 1 年到第 5 年)
  const growth: number[] = [];
  for (const p of paths) {
    if (Array.isArray(p.path_history) && p.path_history.length >= 5) {
      const start = p.path_history[0].salary;
      const end = p.path_history[p.path_history.length - 1].salary;
      if (start && end && start > 0) growth.push((end - start) / start);
    }
  }
  if (growth.length >= 20) {
    const medGrowth = quantile(growth, 0.5);
    if (medGrowth <= 0.5) {
      insights.push({
        id: 'slow-salary-growth',
        level: 'warn',
        title: `5 年薪资中位涨幅只有 ${(medGrowth * 100).toFixed(0)}%`,
        detail: '相当于年化 ~10%,跑不赢"互联网 5 年翻倍"的预期。涨薪节奏要打个折扣。',
        weight: 73,
      });
    } else if (medGrowth >= 1.5) {
      insights.push({
        id: 'fast-salary-growth',
        level: 'info',
        title: `5 年薪资中位涨幅 ${(medGrowth * 100).toFixed(0)}%`,
        detail: '高于互联网平均水平,这条路径的"涨薪潜力"值得抓住。',
        weight: 36,
      });
    }
  }

  // 11) 岗位流动率(转过岗的比例)
  const switchedPos = paths.filter((p) => {
    if (!Array.isArray(p.path_history) || p.path_history.length < 2) return false;
    const first = p.path_history[0].position;
    return p.path_history.some((h) => h.position !== first);
  }).length;
  const posSwitchRate = paths.length ? switchedPos / paths.length : 0;
  if (posSwitchRate >= 0.35) {
    insights.push({
      id: 'high-position-flux',
      level: 'info',
      title: `${(posSwitchRate * 100).toFixed(0)}% 的师兄换过岗`,
      detail: '岗位流动性较高,说明这个起点能给到内部转岗机会。可以提前规划自己的转岗方向。',
      weight: 50,
    });
  }

  // 12) 顶层公司留存率(去到 tier 1/2 的比例)
  const topTier = paths.filter((p) => (p.five_year_company_tier ?? 5) <= 2).length;
  const topTierRate = paths.length ? topTier / paths.length : 0;
  if (paths.length >= 30 && topTierRate >= 0.7) {
    insights.push({
      id: 'top-tier-keep',
      level: 'info',
      title: `${(topTierRate * 100).toFixed(0)}% 的师兄 5 年后还在大厂 / 独角兽`,
      detail: '这是个"留在头部"的稳定路径,但也意味着圈子相对封闭,跳出来去其他赛道需要主动规划。',
      weight: 45,
    });
  } else if (paths.length >= 30 && topTierRate <= 0.2 && (paths[0]?.first_company_tier ?? 5) <= 2) {
    insights.push({
      id: 'top-tier-exit',
      level: 'warn',
      title: `5 年后只有 ${(topTierRate * 100).toFixed(0)}% 还在大厂 / 独角兽`,
      detail: '从大厂起步,5 年后多数人离开,可能是被裁、被动转行,或主动求稳。需要警惕"大厂光环"在 5 年后能否维持。',
      weight: 72,
    });
  }

  // 13) 城市集中度(以 path_history 中能推断的为准 —— 这里用 company_tier 5/6 作为政企城市代理)
  // 数据 mock 里没有城市字段,先用一个粗略代理:tier 5/6 占比高 → 推断为政企城市
  const govLike = paths.filter((p) => (p.five_year_company_tier ?? 0) >= 5).length;
  const govRate = paths.length ? govLike / paths.length : 0;
  if (paths.length >= 30 && govRate >= 0.4) {
    insights.push({
      id: 'gov-pivot',
      level: 'info',
      title: `${(govRate * 100).toFixed(0)}% 的师兄 5 年后流向国企 / 政府 / 传统企业`,
      detail: '这意味着这条路径"求稳"是常见结局。如果你不想走这个方向,要主动规划其他选择。',
      weight: 55,
    });
  }

  // 14) 创业幸存率(S6):first_company_tier = 7 的样本,5 年后画像
  const startupPaths = paths.filter((p) => p.first_company_tier === 7);
  if (startupPaths.length >= 5) {
    const stillStartup = startupPaths.filter((p) => p.five_year_company_tier === 7).length;
    const toBigCompany = startupPaths.filter(
      (p) => p.five_year_company_tier !== undefined && p.five_year_company_tier <= 2,
    ).length;
    const total = startupPaths.length;
    const stillRate = stillStartup / total;
    const bigRate = toBigCompany / total;
    insights.push({
      id: 'startup-survival',
      level: stillRate >= 0.4 ? 'info' : 'warn',
      title: `同期选创业的师兄 5 年后:${(stillRate * 100).toFixed(0)}% 仍在创业,${(bigRate * 100).toFixed(0)}% 转入大厂`,
      detail:
        stillRate >= 0.4
          ? '坚持创业的比例不算低,这条路径有韧性。'
          : '多数人转入大厂或其他赛道,创业的"长期幸存率"偏低,做好备份预案。',
      weight: 88,
    });
  }

  // 15) 公司晋升中位时间(S8):同 group 里 graduate→senior 的中位年数
  // 用现有 yearsToSenior helper 但更聚焦"在原公司没跳走的"样本(更能反映"这家公司的晋升通道")
  const stayedAndPromoted = paths
    .filter(
      (p) =>
        p.first_company_tier !== undefined &&
        p.first_company_tier === p.five_year_company_tier,
    )
    .map(yearsToSenior)
    .filter((y): y is number => y !== null);
  if (stayedAndPromoted.length >= 5) {
    const medYears = quantile(stayedAndPromoted, 0.5);
    insights.push({
      id: 'in-company-promo',
      level: medYears >= 4.5 ? 'warn' : 'info',
      title: `留在同一家公司的师兄,升到 senior 中位 ${medYears.toFixed(1)} 年`,
      detail:
        medYears >= 4.5
          ? '内部晋升通道较慢,如果你看重晋升速度,可能要主动考虑跳槽节奏。'
          : '同公司内部晋升节奏不错,可以考虑深耕。',
      weight: 60,
    });
  }

  // 按 weight 降序排序,取 Top 6(扩到 6 给新的 insights 留位置)
  return insights.sort((a, b) => b.weight - a.weight).slice(0, 6);
}

/* ============ helpers ============ */

function firstYearJump(p: SeniorPath): boolean {
  // 如果有 path_history,看第 1 年和第 0 年的 company_tier 是否不同
  if (Array.isArray(p.path_history) && p.path_history.length >= 2) {
    return p.path_history[1].company_tier !== p.path_history[0].company_tier;
  }
  // 没有 path_history 时,如果 5 年 job_changes >= 2 就近似认为有早跳
  return p.job_changes >= 2;
}

function yearsToSenior(p: SeniorPath): number | null {
  if (!Array.isArray(p.path_history)) return null;
  const seniorIdx = p.path_history.findIndex(
    (h) => (LEVEL_ORDER[h.level] ?? 0) >= (LEVEL_ORDER.senior ?? 4),
  );
  if (seniorIdx === -1) return null;
  return seniorIdx;
}

function pickReason(paths: SeniorPath[], industry: string | undefined): string | null {
  // 简版:基于 industry 给一个常见 reason
  const reasonByIndustry: Record<string, string> = {
    internet: '互联网行业 2022-2023 经历过大裁员,部分师兄是被动跳槽,不一定是主动选择。',
    real_estate: '地产行业在 2022 年爆雷潮后,大量从业者被迫转行。',
    education_training: '双减政策(2021)后,教培系统大面积调整。',
  };
  if (industry && reasonByIndustry[industry]) return reasonByIndustry[industry];
  if (paths.some((p) => p.first_industry === 'internet')) return reasonByIndustry.internet;
  return null;
}

function dominantSwitchTarget(paths: SeniorPath[]): string | null {
  const counter = new Map<string, number>();
  for (const p of paths) {
    if (p.industry_changes >= 1 && p.five_year_industry && p.first_industry !== p.five_year_industry) {
      counter.set(p.five_year_industry, (counter.get(p.five_year_industry) ?? 0) + 1);
    }
  }
  const top = [...counter.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!top) return null;
  return `跳走的师兄,最常去的方向是 ${labelIndustry(top[0])}(${top[1]} 人)。`;
}

function labelIndustry(key: string): string {
  const map: Record<string, string> = {
    internet: '互联网',
    finance: '金融',
    education_training: '教培',
    real_estate: '地产',
    auto_ev: '新能源车',
    tech_hardware: '硬件',
    telecom: '通信',
    energy: '能源',
    consulting: '咨询',
    startup: '创业',
    consumer_service: '消费服务',
  };
  return map[key] ?? key;
}

export function _internals_for_testing() {
  return { firstYearJump, yearsToSenior, dominantSwitchTarget, labelIndustry };
}
