/**
 * 「核心结论」提炼引擎 —— 把结果页这一堆图/表提炼为 1 句话 + 3 张大卡片。
 *
 * 目标:用户进来不滚动就能看到 这个 offer 5 年后值不值得;每张卡能定位到下方哪张图支撑它。
 * 纯函数:输入 paths + correction + 已生成的 insights,输出 TL;DR 数据。
 */
import type { CorrectionResult, SeniorPath } from './types';
import type { Insight } from './insights-engine';
import { quantile } from './utils';

export type Verdict = 'good' | 'neutral' | 'bad';

export interface KeyTakeaway {
  /** 一句话核心结论 */
  headline: string;
  verdict: Verdict;
  /** 3 张关键数字卡片 */
  cards: TakeawayCard[];
  /** 最重要的 1 条警示(从 insights 里挑 weight 最高的) */
  topRisk?: { title: string; detail: string; level: 'info' | 'warn' | 'danger' };
}

export interface TakeawayCard {
  /** 卡片标题(指标名) */
  label: string;
  /** 大数字 */
  value: string;
  /** 数字下方的趋势/对比文案 */
  hint: string;
  /** 颜色基调 */
  tone: 'good' | 'neutral' | 'bad';
  /** 锚点:点击跳转到哪个 sectionId */
  anchor?: string;
}

export function generateTakeaways(opts: {
  paths: SeniorPath[];
  correction?: CorrectionResult;
  insights: Insight[];
  /** 用 AI 联网薪资覆盖 mock(senior 区间元/年);若有则取代 P50 */
  aiSeniorSalaryMid?: number;
  /** 薪资缩放系数,与 result-client 一致 */
  salaryScale?: number;
}): KeyTakeaway {
  const { paths, correction, insights, aiSeniorSalaryMid, salaryScale = 1 } = opts;

  const original = correction?.original_score ?? 0;
  const corrected = correction?.corrected_score ?? 0;
  const delta = corrected - original;

  const verdict = pickVerdict(corrected, delta, insights);

  const cards: TakeawayCard[] = [];

  // 卡片 1:环境校正后潜力分
  if (correction) {
    cards.push({
      label: '环境校正后 · 综合潜力',
      value: `${corrected.toFixed(1)}`,
      hint:
        delta === 0
          ? '与原始评分持平'
          : delta > 0
          ? `比原始评分高 ${delta.toFixed(1)} 分(时代红利偏正)`
          : `时代红利扣减 ${Math.abs(delta).toFixed(1)} 分`,
      tone: corrected >= 65 ? 'good' : corrected >= 50 ? 'neutral' : 'bad',
      anchor: 'correction',
    });
  }

  // 卡片 2:5 年中位薪资(优先 AI 市场,否则用 mock × scale)
  const mockSalaries = paths.map((p) => (p.five_year_salary ?? 0) * salaryScale).filter((s) => s > 0);
  const mockMid = mockSalaries.length ? quantile(mockSalaries, 0.5) : 0;
  const midSalary = aiSeniorSalaryMid && aiSeniorSalaryMid > 0 ? aiSeniorSalaryMid : mockMid;
  if (midSalary > 0) {
    const wanYi = midSalary / 10_000;
    cards.push({
      label: '5 年后年薪中位',
      value: `${wanYi.toFixed(0)} 万`,
      hint: aiSeniorSalaryMid
        ? '取自 AI 联网市场参考'
        : `${paths.length} 位师兄实际薪资中位`,
      tone: wanYi >= 35 ? 'good' : wanYi >= 22 ? 'neutral' : 'bad',
      anchor: 'salary',
    });
  }

  // 卡片 3:最关键风险/路径走向(看 insights 里 weight 最高的 1 条)
  const topInsight = insights[0];
  if (topInsight) {
    cards.push({
      label: topInsight.level === 'info' ? '最值得关注' : '最值得警惕',
      value: extractHeadlineNumber(topInsight.title) ?? simplifyTitle(topInsight.title),
      hint: shortenTitle(topInsight.title),
      tone: topInsight.level === 'danger' ? 'bad' : topInsight.level === 'warn' ? 'bad' : 'neutral',
      anchor: 'insights',
    });
  }

  const headline = buildHeadline({
    verdict,
    delta,
    corrected,
    paths,
    insights,
    midSalary,
  });

  const topRisk = insights.find((i) => i.level === 'danger') ?? insights.find((i) => i.level === 'warn');

  return {
    headline,
    verdict,
    cards,
    topRisk: topRisk
      ? { title: topRisk.title, detail: topRisk.detail, level: topRisk.level }
      : undefined,
  };
}

/* ===== helpers ===== */

function pickVerdict(corrected: number, delta: number, insights: Insight[]): Verdict {
  const dangerCount = insights.filter((i) => i.level === 'danger').length;
  if (dangerCount >= 2 || corrected < 45) return 'bad';
  if (corrected >= 65 && delta >= -5 && dangerCount === 0) return 'good';
  return 'neutral';
}

function buildHeadline(opts: {
  verdict: Verdict;
  delta: number;
  corrected: number;
  paths: SeniorPath[];
  insights: Insight[];
  midSalary: number;
}): string {
  const { verdict, delta, corrected, paths, midSalary } = opts;
  const sample = paths.length;
  const wan = midSalary > 0 ? `${(midSalary / 10_000).toFixed(0)} 万` : '—';
  const deltaTxt =
    delta < -10
      ? `时代红利扣减 ${Math.abs(delta).toFixed(0)} 分`
      : delta < 0
      ? `略受时代回落影响(-${Math.abs(delta).toFixed(1)})`
      : delta > 5
      ? `处在正向赛道(+${delta.toFixed(1)})`
      : '校正后基本持平';

  if (verdict === 'bad') {
    return `这条路径整体偏弱:${sample} 位师兄 5 年中位 ${wan},${deltaTxt}。下方有 ${opts.insights.filter((i) => i.level !== 'info').length} 条警示,值得先看。`;
  }
  if (verdict === 'good') {
    return `这条路径还不错:${sample} 位师兄 5 年中位 ${wan},综合潜力 ${corrected.toFixed(0)} 分,${deltaTxt}。`;
  }
  return `这条路径属于"中等水位":${sample} 位师兄 5 年中位 ${wan},${deltaTxt};能不能跑出来,看你能否避开下方这几个坑。`;
}

/** 从 insight title 里抽出第一个"百分比/数字"作为大数字展示 */
function extractHeadlineNumber(title: string): string | null {
  // 匹配类似 "30%" / "3.5 年" / "8 万"
  const m = title.match(/(\d+(?:\.\d+)?)\s*(%|年|万|个|分)/);
  if (!m) return null;
  return `${m[1]}${m[2]}`;
}

/** 没有可抽数字时,取标题前 8 字作为大字 */
function simplifyTitle(title: string): string {
  return title.length > 8 ? title.slice(0, 8) + '…' : title;
}

/** 把 insight title 整体折叠成一行短描述 */
function shortenTitle(title: string): string {
  return title.length > 28 ? title.slice(0, 28) + '…' : title;
}

/* ============ 各图表「该图重点」一句话 ============ */

export interface ChartFocus {
  text: string;
  tone: 'info' | 'warn' | 'good';
}

export function timelineFocus(opts: {
  same: SeniorPath[];
  higher: SeniorPath[];
  lower: SeniorPath[];
  salaryScale: number;
}): ChartFocus {
  const yr5 = (g: SeniorPath[]) => {
    const s = g.map((p) => (p.five_year_salary ?? 0) * opts.salaryScale).filter((v) => v > 0);
    return s.length ? quantile(s, 0.5) : 0;
  };
  const sm = yr5(opts.same);
  const hi = yr5(opts.higher);
  const lo = yr5(opts.lower);
  if (!sm) return { text: '同档师兄数据不足,先放宽筛选或参考下方逐条路径。', tone: 'warn' };
  const gapUp = hi > 0 ? Math.round(((hi - sm) / sm) * 100) : 0;
  const gapDown = lo > 0 ? Math.round(((sm - lo) / sm) * 100) : 0;
  if (gapUp >= 20 || gapDown >= 20) {
    return {
      text: `5 年后,高档背景比同档高 ${gapUp}%,同档比低档高 ${gapDown}% —— 背景差距在 5 年里继续放大,看实线。`,
      tone: 'warn',
    };
  }
  return {
    text: `三档师兄 5 年后薪资差距 ${Math.max(gapUp, gapDown)}%,背景的边际收益在收敛 —— 重点看虚线职级而不是薪资。`,
    tone: 'info',
  };
}

export function threeGroupFocus(opts: {
  same: number;
  higher: number;
  lower: number;
}): ChartFocus {
  const total = opts.same + opts.higher + opts.lower;
  if (!total) return { text: '没有可对比样本。', tone: 'warn' };
  const pct = Math.round((opts.same / total) * 100);
  if (pct >= 50) {
    return {
      text: `${pct}% 的师兄来自和你同档次的院校,这块蓝色才是真正可参考的对照组 —— 高/低档师兄的画像只能作为方差参考。`,
      tone: 'good',
    };
  }
  if (pct <= 20) {
    return {
      text: `只有 ${pct}% 同档师兄,大头(${100 - pct}%)是高/低档背景 —— 直接套他们的结果会失真,先看下方逐条路径里同档的几位。`,
      tone: 'warn',
    };
  }
  return {
    text: `同档师兄 ${pct}%,可对照样本充足 —— 重点对比"同档 vs 高档"的差距,这是背景溢价的真实大小。`,
    tone: 'info',
  };
}

export function salaryTrendFocus(opts: {
  paths: SeniorPath[];
  salaryScale: number;
  aiMid?: number;
}): ChartFocus {
  const ss = opts.paths
    .map((p) => (p.five_year_salary ?? 0) * opts.salaryScale)
    .filter((v) => v > 0);
  if (ss.length < 5) return { text: '样本太少,看不出分布。', tone: 'warn' };
  const p10 = quantile(ss, 0.1) / 10_000;
  const p50 = (opts.aiMid ?? quantile(ss, 0.5)) / 10_000;
  const p90 = quantile(ss, 0.9) / 10_000;
  const spread = p90 / Math.max(p10, 1);
  if (spread >= 3) {
    return {
      text: `中位 ${p50.toFixed(0)} 万,但 P90 能到 ${p90.toFixed(0)} 万(P10 只有 ${p10.toFixed(0)} 万)—— 差距大,头部师兄做对了什么是关键。`,
      tone: 'good',
    };
  }
  return {
    text: `中位 ${p50.toFixed(0)} 万,P10-P90 区间 ${p10.toFixed(0)}-${p90.toFixed(0)} 万 —— 这条路径"上下浮动空间"有限,薪资可预期。`,
    tone: 'info',
  };
}

export function sankeyFocus(opts: { paths: SeniorPath[] }): ChartFocus {
  const switched = opts.paths.filter(
    (p) =>
      p.first_industry &&
      p.five_year_industry &&
      p.first_industry !== p.five_year_industry,
  );
  const rate = opts.paths.length ? switched.length / opts.paths.length : 0;
  const counter = new Map<string, number>();
  for (const p of switched) {
    if (p.five_year_industry) counter.set(p.five_year_industry, (counter.get(p.five_year_industry) ?? 0) + 1);
  }
  const top = [...counter.entries()].sort((a, b) => b[1] - a[1])[0];
  const indLabel = top ? labelIndustryQuick(top[0]) : null;
  if (rate >= 0.4 && indLabel) {
    return {
      text: `${Math.round(rate * 100)}% 的师兄 5 年内换了行业,最常流向「${indLabel}」—— 这条路径的"行业粘性"低于你想象。`,
      tone: 'warn',
    };
  }
  if (rate <= 0.15) {
    return {
      text: `只有 ${Math.round(rate * 100)}% 换过行业,这是个"深耕型"赛道 —— 选了基本就不容易转出去。`,
      tone: 'info',
    };
  }
  return {
    text: `${Math.round(rate * 100)}% 换过行业,流向比较分散 —— 看主流走向 + 你愿不愿意跟着走。`,
    tone: 'info',
  };
}

export function pathsListFocus(opts: { totalCount: number; baselineCount: number; highFitCount?: number }): ChartFocus {
  if (typeof opts.highFitCount === 'number' && opts.highFitCount > 0) {
    return {
      text: `按"起点契合度"排序:前 ${opts.highFitCount} 位与你 offer 同行业 + 同公司档次(标"高契合"),最具参考价值;往下契合度递减,标"参考用"的师兄起点不同,只能看趋势。`,
      tone: 'good',
    };
  }
  return {
    text: `本批样本里和你 offer 起点(行业 + 公司档次)完全一致的师兄不多,建议优先看标"同行业起步"或"同 tier 起步"的几位;"参考用"标签的师兄起点不同,只能看大致趋势。`,
    tone: 'warn',
  };
}

function labelIndustryQuick(key: string): string {
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
