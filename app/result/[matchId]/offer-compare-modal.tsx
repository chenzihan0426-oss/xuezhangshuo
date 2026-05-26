/**
 * Offer 对比 Modal —— 多 Offer 时,在结果页右上角触发,
 * 横向对比综合潜力 / 薪资 / 行业 / AI 风险 / 起点加成 / 政策事件。
 *
 * 数据源:/api/match/[id]/batch(扩展后返回各 offer 的 correction_data 关键字段)
 * 不重新计算,直接读已落库的校正结果,保证和单页一致。
 */
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactECharts from 'echarts-for-react';
import { GitCompare, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CHART_COLORS, FONT_FAMILY } from '@/lib/chart-theme';
import { formatSalary } from '@/lib/utils';

interface BatchOffer {
  id: string;
  status: string;
  company_name: string;
  position_category: string;
  level?: string;
  salary_min?: number;
  salary_max?: number;
  original_score?: number;
  corrected_score?: number;
  /** AI 公司级精化系数,与反推页 displayCorrected = corrected * ai_company_adjustment 对齐 */
  ai_company_adjustment?: number;
  industry_factor?: number;
  ai_risk?: number;
  cohort?: number;
  personal_boost?: number;
  offer_salary_factor?: number;
  policy_event_count?: number;
  salary_p50?: number;
  ai_senior_salary_mid?: number | null;
  match_level?: string;
  sample_size?: number;
}

/** 与反推页 result-client.tsx / correction-panel.tsx 一致的口径:校正分 = 规则基线 * AI 调整,限幅 [0,100] */
function displayCorrectedOf(o: BatchOffer): number {
  const base = o.corrected_score ?? 0;
  const adj = o.ai_company_adjustment ?? 1;
  return Math.round(Math.min(100, Math.max(0, base * adj)) * 10) / 10;
}

const DIMENSIONS = [
  { key: 'potential', label: '综合潜力', max: 100 },
  { key: 'salary', label: '薪资潜力', max: 100 },
  { key: 'industry', label: '行业景气', max: 100 },
  { key: 'ai_resilient', label: 'AI 韧性', max: 100 },
  { key: 'start_boost', label: '起点加成', max: 100 },
  { key: 'policy_stable', label: '政策稳定', max: 100 },
] as const;

const SERIES_COLORS = [CHART_COLORS.brand, CHART_COLORS.emerald, CHART_COLORS.amber, '#a855f7'];

export default function OfferCompareModal({ activeMatchId }: { activeMatchId: string }) {
  const [open, setOpen] = useState(false);
  const [offers, setOffers] = useState<BatchOffer[] | null>(null);
  /** 正在联网补齐 AI 薪资的 offer 数量 */
  const [briefBackfilling, setBriefBackfilling] = useState(0);
  const router = useRouter();

  // 1) 挂载时先拉一次,决定要不要显示"对比 N 个 Offer"按钮
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/match/${activeMatchId}/batch`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setOffers(d.items ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [activeMatchId]);

  // 2) 打开 Modal 时补齐 AI 薪资:对每个缺 ai_senior_salary_mid 的 offer 主动触发 brief 生成,
  //    完成后 refetch batch,让 Modal 显示和反推页同源的 AI 联网薪资。
  //    解决"反推页 75 万 vs Modal 22.6 万"—— 仅打开过的 offer 才有 AI brief。
  // attemptedRef 记录已尝试过补齐的 offer id,防止 brief 失败时反复触发(useEffect 无限循环)。
  const attemptedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!open || !offers) return;
    const needBrief = offers.filter(
      (o) =>
        o.status === 'completed' &&
        !o.ai_senior_salary_mid &&
        !attemptedRef.current.has(o.id),
    );
    if (!needBrief.length) return;
    needBrief.forEach((o) => attemptedRef.current.add(o.id));

    let cancelled = false;
    setBriefBackfilling(needBrief.length);
    Promise.allSettled(
      needBrief.map((o) => fetch(`/api/match/${o.id}/brief`).then((r) => r.json()).catch(() => null)),
    )
      .then(() => fetch(`/api/match/${activeMatchId}/batch`))
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setOffers(d.items ?? []);
      })
      .finally(() => {
        if (!cancelled) setBriefBackfilling(0);
      });
    return () => {
      cancelled = true;
    };
  }, [open, offers, activeMatchId]);

  const completedOffers = useMemo(
    () => (offers ?? []).filter((o) => o.status === 'completed' && typeof o.corrected_score === 'number'),
    [offers],
  );

  // 多 offer 才展示按钮
  if (!offers || completedOffers.length < 2) return null;

  // 归一化:薪资潜力按全组最大值归一
  const maxSalary = Math.max(
    1,
    ...completedOffers.map((o) => o.ai_senior_salary_mid ?? o.salary_p50 ?? 0),
  );

  const dimsByOffer = completedOffers.map((o) => {
    const salaryRef = o.ai_senior_salary_mid ?? o.salary_p50 ?? 0;
    const display = displayCorrectedOf(o);
    return {
      offer: o,
      display, // 与反推页一致的"环境校正后 · 综合潜力"
      dims: {
        potential: clamp(display, 0, 100),
        salary: clamp((salaryRef / maxSalary) * 100, 0, 100),
        industry: clamp((o.industry_factor ?? 1) * 80, 0, 100), // 1.0 → 80,1.25 → 100
        ai_resilient: clamp((1 - (o.ai_risk ?? 0)) * 100, 0, 100),
        start_boost: clamp((o.personal_boost ?? 1) * 80, 0, 100),
        policy_stable: clamp(100 - (o.policy_event_count ?? 0) * 25, 0, 100),
      },
    };
  });

  // 选出"综合潜力分最高"的 offer 作为推荐(用 displayCorrected,与反推页同源)
  const winner = [...dimsByOffer].sort((a, b) => b.display - a.display)[0];

  const radarOption: any = {
    color: SERIES_COLORS,
    legend: {
      bottom: 0,
      type: 'scroll',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { color: CHART_COLORS.textMuted, fontSize: 12, fontFamily: FONT_FAMILY },
    },
    tooltip: { trigger: 'item' },
    radar: {
      indicator: DIMENSIONS.map((d) => ({ name: d.label, max: d.max })),
      shape: 'polygon',
      splitNumber: 4,
      axisName: { color: CHART_COLORS.text, fontSize: 12, fontFamily: FONT_FAMILY },
      splitLine: { lineStyle: { color: CHART_COLORS.grid } },
      splitArea: { areaStyle: { color: ['#f8fafc', '#ffffff'] } },
    },
    series: [
      {
        type: 'radar',
        emphasis: { focus: 'series' },
        data: dimsByOffer.map(({ offer, dims }, i) => ({
          name: offer.company_name,
          value: DIMENSIONS.map((d) => Math.round(dims[d.key as keyof typeof dims])),
          areaStyle: { opacity: 0.18, color: SERIES_COLORS[i % SERIES_COLORS.length] },
          lineStyle: { width: 2 },
        })),
      },
    ],
  };

  const recommendText = buildRecommendation(dimsByOffer);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <GitCompare size={14} />
        对比 {completedOffers.length} 个 Offer
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] w-[95vw] max-w-5xl overflow-y-auto sm:rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare size={18} className="text-brand-600" />
              Offer 多维对比
            </DialogTitle>
            <DialogDescription>
              所有维度都基于"环境校正后"的可比口径,数字越大越好。
            </DialogDescription>
          </DialogHeader>

          {briefBackfilling > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50/70 px-3 py-2 text-xs text-sky-800">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-sky-500" />
              正在联网核对 {briefBackfilling} 个 offer 的市场薪资,让对比口径完全统一…(约 10-30 秒)
            </div>
          )}

          {/* 一句话推荐 */}
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm">
            <Trophy size={16} className="mt-0.5 flex-shrink-0 text-emerald-600" />
            <div className="space-y-0.5">
              <div className="font-semibold text-emerald-900">综合建议:{winner.offer.company_name}</div>
              <p className="text-xs text-emerald-800/90">{recommendText}</p>
            </div>
          </div>

          {/* 雷达图 */}
          <div className="rounded-lg border bg-white p-2">
            <ReactECharts option={radarOption} style={{ height: 360 }} />
          </div>

          {/* 关键指标表 */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">维度</th>
                  {completedOffers.map((o) => (
                    <th key={o.id} className="px-3 py-2 text-left font-semibold text-slate-900">
                      {o.company_name}
                      <div className="mt-0.5 text-[10px] font-normal text-slate-500">
                        {o.position_category}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                <Row label="综合潜力(校正分)" cells={completedOffers.map((o) => fmtScore(displayCorrectedOf(o), o.original_score))} highlightIdx={argMax(completedOffers, (o) => displayCorrectedOf(o))} />
                <Row label="5 年中位年薪" cells={completedOffers.map((o) => formatSalary(o.ai_senior_salary_mid ?? o.salary_p50 ?? 0))} highlightIdx={argMax(completedOffers, (o) => o.ai_senior_salary_mid ?? o.salary_p50 ?? 0)} />
                <Row label="行业景气因子" cells={completedOffers.map((o) => fmtMult(o.industry_factor))} highlightIdx={argMax(completedOffers, (o) => o.industry_factor ?? 0)} />
                <Row label="AI 替代风险" cells={completedOffers.map((o) => `${((o.ai_risk ?? 0) * 100).toFixed(0)}%`)} highlightIdx={argMin(completedOffers, (o) => o.ai_risk ?? 1)} positiveLower />
                <Row label="政策事件" cells={completedOffers.map((o) => `${o.policy_event_count ?? 0} 项`)} highlightIdx={argMin(completedOffers, (o) => o.policy_event_count ?? 99)} positiveLower />
                <Row label="时代红利(cohort)" cells={completedOffers.map((o) => fmtMult(o.cohort))} highlightIdx={argMax(completedOffers, (o) => o.cohort ?? 0)} />
                <Row label="起点加成(personal)" cells={completedOffers.map((o) => fmtMult(o.personal_boost))} highlightIdx={argMax(completedOffers, (o) => o.personal_boost ?? 0)} />
                <Row label="样本量 / 匹配维度" cells={completedOffers.map((o) => `${o.sample_size ?? 0} 条 · ${matchLevelLabel(o.match_level)}`)} />
              </tbody>
            </table>
          </div>

          {/* 跳转按钮 */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
            <span className="mr-auto text-xs text-muted-foreground">
              点下方按钮跳到该 offer 的完整分析:
            </span>
            {completedOffers.map((o) => (
              <Button
                key={o.id}
                size="sm"
                variant={o.id === activeMatchId ? 'default' : 'outline'}
                onClick={() => {
                  if (o.id !== activeMatchId) router.push(`/result/${o.id}`);
                  setOpen(false);
                }}
              >
                {o.company_name}
                {o.id === activeMatchId && (
                  <Badge variant="secondary" className="ml-2 px-1 py-0 text-[10px]">
                    当前
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({
  label,
  cells,
  highlightIdx,
  positiveLower,
}: {
  label: string;
  cells: string[];
  highlightIdx?: number;
  positiveLower?: boolean;
}) {
  return (
    <tr>
      <td className="px-3 py-2 text-xs font-medium text-slate-600">{label}</td>
      {cells.map((v, i) => (
        <td
          key={i}
          className={`px-3 py-2 ${
            i === highlightIdx
              ? positiveLower
                ? 'font-semibold text-emerald-700'
                : 'font-semibold text-brand-700'
              : 'text-slate-700'
          }`}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}

function fmtScore(c?: number, o?: number) {
  if (typeof c !== 'number') return '-';
  const delta = typeof o === 'number' ? c - o : 0;
  const sign = delta > 0 ? '+' : '';
  return `${c.toFixed(1)}  (${sign}${delta.toFixed(1)})`;
}
function fmtMult(v?: number) {
  if (typeof v !== 'number') return '-';
  return `${(v * 100).toFixed(0)}%`;
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function argMax<T>(arr: T[], get: (x: T) => number): number {
  let bestI = 0;
  let bestV = -Infinity;
  arr.forEach((x, i) => {
    const v = get(x);
    if (v > bestV) {
      bestV = v;
      bestI = i;
    }
  });
  return bestI;
}
function argMin<T>(arr: T[], get: (x: T) => number): number {
  let bestI = 0;
  let bestV = Infinity;
  arr.forEach((x, i) => {
    const v = get(x);
    if (v < bestV) {
      bestV = v;
      bestI = i;
    }
  });
  return bestI;
}
function matchLevelLabel(level?: string): string {
  const map: Record<string, string> = {
    exact_company_position: '同公司同岗',
    same_company_any_position: '同公司',
    same_tier_industry_position: '同档同行业',
    same_tier_position: '同档同岗',
    position_only: '仅同岗位',
  };
  return level ? map[level] ?? level : '—';
}

function buildRecommendation(
  list: { offer: BatchOffer; display: number; dims: Record<string, number> }[],
): string {
  if (!list.length) return '';
  const ranked = [...list].sort((a, b) => b.display - a.display);
  const top = ranked[0];
  const runner = ranked[1];
  const score = top.display.toFixed(1);
  const gap = runner ? top.display - runner.display : 0;

  const strengths: string[] = [];
  if (top.dims.salary >= 75) strengths.push('薪资潜力');
  if (top.dims.industry >= 75) strengths.push('行业景气');
  if (top.dims.ai_resilient >= 75) strengths.push('AI 韧性');
  if (top.dims.policy_stable >= 90) strengths.push('政策稳定');
  const strengthsTxt = strengths.length ? strengths.slice(0, 2).join('、') + '更突出' : '综合分较高';

  if (gap >= 8) {
    return `${top.offer.company_name} 校正分 ${score},比第二名高 ${gap.toFixed(1)} 分,${strengthsTxt};差距明显,建议优先考虑。`;
  }
  if (gap >= 3) {
    return `${top.offer.company_name} 校正分 ${score},比第二名高 ${gap.toFixed(1)} 分,${strengthsTxt};差距中等,看你更看重哪个维度。`;
  }
  return `各 offer 校正分接近(差距 < 3 分),不存在明显胜出者 —— 建议看雷达图上各自的"长板",挑你最不能妥协的那个维度。`;
}
