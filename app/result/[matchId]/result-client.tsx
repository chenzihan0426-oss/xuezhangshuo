'use client';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { ResultSkeleton } from './result-skeleton';
import OfferTabs from './offer-tabs';
import ThreeGroupChart from './three-group-chart';
import SalaryTrend from './salary-trend';
import SankeyFlow from './sankey-flow';
import CorrectionPanel from './correction-panel';
import PaywallModal from './paywall-modal';
import ShareCard from './share-card';
import InsightsPanel from './insights-panel';
import MatchLevelBanner from './match-level-banner';
import FiltersBar from './filters-bar';
import TimelineChart from './timeline-chart';
import PathsList from './paths-list';
import KeyTakeaways from './key-takeaways';
import OfferCompareModal from './offer-compare-modal';
import ChartHighlight from './chart-highlight';
import { EMPTY_FILTERS, applyFilters, type PathFilters } from '@/lib/path-filters';
import { generateInsights } from '@/lib/insights-engine';
import {
  generateTakeaways,
  timelineFocus,
  threeGroupFocus,
  salaryTrendFocus,
  sankeyFocus,
  pathsListFocus,
} from '@/lib/key-takeaways';
import { PAYWALL } from '@/lib/constants';
import { formatSalary, quantile, clamp } from '@/lib/utils';
import { splitGroups } from '@/lib/match-helpers';
import type { SeniorPath } from '@/lib/types';

export default function ResultClient({
  matchId,
  initial,
}: {
  matchId: string;
  initial: any;
}) {
  const [match, setMatch] = useState<any>(initial);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [filters, setFilters] = useState<PathFilters>(EMPTY_FILTERS);
  const [paid, setPaid] = useState(false);
  const [aiBrief, setAiBrief] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiNonce, setAiNonce] = useState(0);

  // 轮询直到 completed
  useEffect(() => {
    if (match?.status === 'computing') {
      const t = setInterval(async () => {
        const res = await fetch(`/api/match/${matchId}`);
        if (res.ok) {
          const next = await res.json();
          setMatch(next);
          if (next.status !== 'computing') clearInterval(t);
        }
      }, 1500);
      return () => clearInterval(t);
    }
  }, [match?.status, matchId]);

  // AI 联网简报:提到父层 fetch 一次,同时供校正面板(薪资对齐)和 AI 区块用,避免重复调用
  useEffect(() => {
    if (match?.status !== 'completed') return;
    let cancelled = false;
    setAiLoading(true);
    fetch(`/api/match/${matchId}/brief`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setAiBrief(d);
      })
      .catch(() => {
        if (!cancelled) setAiBrief({ found: false, summary: '', events: [], degraded: 'error' });
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId, match?.status, aiNonce]);

  const allPaths: SeniorPath[] = useMemo(() => match?.paths ?? [], [match?.paths]);
  const userOffer = match?.user_offers;

  // 分组基准 = 用户真实院校档次(优先);旧 match 没存时回退到候选集众数
  const userSchoolTier: number | undefined = match?.correction_data?.user_school_tier;
  const baselineTier = useMemo(() => {
    if (userSchoolTier) return userSchoolTier;
    if (!allPaths.length) return 3;
    const counter = new Map<number, number>();
    for (const p of allPaths) counter.set(p.school_tier, (counter.get(p.school_tier) ?? 0) + 1);
    return [...counter.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 3;
  }, [allPaths, userSchoolTier]);

  // 缩放系数:把 mock 师兄薪资整体抬到 AI 市场量级(仅展示,保留分布形状)
  const salaryScale = useMemo(() => {
    const sr = aiBrief?.salary_range;
    if (!sr) return 1;
    const aiMedYuan = ((sr.senior_low + sr.senior_high) / 2) * 10_000;
    const mockSalaries = allPaths.map((p: any) => p.five_year_salary ?? 0).filter((s: number) => s > 0);
    if (!mockSalaries.length) return 1;
    const mockMed = quantile(mockSalaries, 0.5);
    if (mockMed <= 0) return 1;
    return clamp(aiMedYuan / mockMed, 0.2, 5);
  }, [aiBrief, allPaths]);

  // 先应用 filter,再拆三组(薪资阈值与展示同口径,见 applyFilters)
  const filtered = useMemo(
    () => applyFilters(allPaths, filters, salaryScale),
    [allPaths, filters, salaryScale],
  );
  const { same, higher, lower } = useMemo(
    () => splitGroups(filtered, baselineTier),
    [filtered, baselineTier],
  );

  // 师兄列表按"起点契合度"排序:
  //   同行业 +100 · 同公司 tier +50 · 同岗位类目 +30 · 院校档次每差 1 级 -5
  // 这样 L5 兜底("仅同岗位")带回来的不相关师兄会沉底,而不是混在前几条。
  // 同时给每条路径打一个 fit 分,供 PathsList 显示"契合度"badge。
  const offerIndustry = useMemo(
    () =>
      match?.correction_data?.offer_industry ??
      userOffer?.first_industry ??
      inferIndustry(userOffer?.company_id, allPaths),
    [match?.correction_data, userOffer, allPaths],
  );
  const offerCompanyTier: number | undefined = userOffer?.company_tier;
  const offerPositionCat: string | undefined = userOffer?.position_category;
  const baseSchoolTier = userSchoolTier ?? baselineTier;

  const computeFit = (p: SeniorPath): number => {
    let s = 0;
    if (offerIndustry && offerIndustry !== 'other' && p.first_industry === offerIndustry) s += 100;
    if (offerCompanyTier && p.first_company_tier === offerCompanyTier) s += 50;
    if (offerPositionCat && p.first_position_category === offerPositionCat) s += 30;
    s -= Math.abs((p.school_tier ?? 3) - baseSchoolTier) * 5;
    return s;
  };

  const listPaths = useMemo(() => {
    return [...filtered]
      .map((p) => ({ p, fit: computeFit(p) }))
      .sort((a, b) => b.fit - a.fit)
      .map(({ p, fit }) => ({ ...p, _fit: fit } as SeniorPath & { _fit: number }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, offerIndustry, offerCompanyTier, offerPositionCat, baseSchoolTier]);

  // AI 公司级精化后的展示用校正分,与 CorrectionPanel/对比 Modal 同公式
  // (hero 大数字、TL;DR、insights 必须用同一个值,否则同页出现两个"综合潜力分")
  const aiAdjustment = aiBrief?.correction?.company_adjustment ?? 1;
  const displayCorrection = useMemo(() => {
    const c = match?.correction_data;
    if (!c || typeof c.corrected_score !== 'number') return c;
    return {
      ...c,
      corrected_score: Math.round(Math.min(100, Math.max(0, c.corrected_score * aiAdjustment)) * 10) / 10,
    };
  }, [match?.correction_data, aiAdjustment]);

  const insights = useMemo(
    () =>
      generateInsights({
        paths: filtered,
        correction: displayCorrection,
        // 复用统一口径(correction_data 优先),不再自己重新推断
        offerIndustry,
        offerPositionCategory: userOffer?.position_category,
        salaryScale,
      }),
    [filtered, displayCorrection, offerIndustry, userOffer, salaryScale],
  );

  const takeaway = useMemo(
    () =>
      generateTakeaways({
        paths: filtered,
        correction: displayCorrection,
        insights,
        aiSeniorSalaryMid: aiBrief?.salary_range
          ? ((aiBrief.salary_range.senior_low + aiBrief.salary_range.senior_high) / 2) * 10_000
          : undefined,
        salaryScale,
      }),
    [filtered, displayCorrection, insights, aiBrief, salaryScale],
  );

  if (!match) return null;
  if (match.status === 'computing') {
    return (
      <div className="min-h-screen -my-6 bg-slate-50">
        <div className="mx-auto max-w-7xl space-y-4 px-4 pt-6 md:px-8">
          <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3 text-center text-sm text-brand-700">
            正在反推这个 offer,大概 5 秒…(已加载脱敏后的师兄路径)
          </div>
          <ResultSkeleton />
        </div>
      </div>
    );
  }
  if (match.status === 'failed') {
    return (
      <div className="min-h-screen -my-6 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 pt-12 md:px-8">
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm">
            <p className="font-semibold text-destructive">反推失败</p>
            <p className="mt-1 text-muted-foreground">{match.error_message}</p>
            <Button asChild className="mt-4">
              <Link href="/input">重新提交</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const visiblePathCount = paid ? PAYWALL.PAID_PATHS_VISIBLE : PAYWALL.FREE_PATHS_VISIBLE;
  const cd = match.correction_data ?? {};

  // AI 市场薪资(senior 区间,元/年),用于校正面板"5 年后薪资"与之对齐
  const aiSeniorSalary = aiBrief?.salary_range
    ? { low: aiBrief.salary_range.senior_low * 10_000, high: aiBrief.salary_range.senior_high * 10_000 }
    : undefined;

  // 暗色 hero 用:校正分大数字 + 时代红利 delta + 风控带(用 AI 精化后的展示值,与校正面板一致)
  const correctedScore = displayCorrection?.corrected_score;
  const originalScore = cd.original_score;
  const delta =
    typeof correctedScore === 'number' && typeof originalScore === 'number'
      ? correctedScore - originalScore
      : 0;
  const totalSample = (match.same_count ?? 0) + (match.higher_count ?? 0) + (match.lower_count ?? 0);
  const industryFactor: number | undefined = cd.factors?.industry;
  const aiRisk: number | undefined = cd.factors?.ai_risk;
  const policyEvents: string[] = cd.factors?.policy_events ?? [];

  return (
    <div className="min-h-screen -my-6 bg-slate-50 pb-20">
      <div className="mx-auto max-w-7xl space-y-6 px-4 pt-6 md:px-8">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild className="-ml-3 text-slate-500 hover:text-slate-900">
          <Link href="/profile">
            <ArrowLeft size={16} className="mr-1.5" /> 返回我的档案
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <ShareCard matchId={matchId} />
          <OfferCompareModal activeMatchId={matchId} />
          <Button asChild size="sm" className="bg-brand-600 hover:bg-brand-700">
            <Link href="/input">新增 Offer</Link>
          </Button>
        </div>
      </div>

      {/* 报告头部仪表盘(暗色 hero + 校正分 + 风控带) */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-900 px-6 py-8 text-white md:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/20 text-emerald-400">
                  报告生成完毕
                </Badge>
                <span className="text-xs text-slate-400">ID: {matchId.split('-')[0].toUpperCase()}</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                {userOffer?.company_name ?? `#${userOffer?.company_id}`} ·{' '}
                {userOffer?.position_category ?? '未知岗位'}
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                {userOffer?.level}
                {userOffer?.salary_min
                  ? ` · ${formatSalary(userOffer.salary_min)} - ${formatSalary(userOffer.salary_max)}`
                  : ''}
                {totalSample > 0 && ` · 基于 ${totalSample} 份脱敏履历的 5 年期对标`}
              </p>
            </div>

            <div className="min-w-[200px] rounded-lg border border-slate-700/50 bg-slate-800/50 p-4 text-right backdrop-blur-sm">
              <div className="text-xs font-medium text-slate-400">环境校正后 · 综合潜力分</div>
              <div className="mt-1 flex items-baseline justify-end gap-1">
                <span className="text-4xl font-black text-white">
                  {typeof correctedScore === 'number' ? correctedScore.toFixed(1) : '-'}
                </span>
                <span className="text-sm text-emerald-400">/ 100</span>
              </div>
              <div className="mt-1 flex items-center justify-end gap-1 text-xs text-slate-500">
                <span>时代红利扣减:</span>
                <span className={delta < 0 ? 'text-amber-400' : 'text-emerald-400'}>
                  {delta > 0 ? '+' : ''}
                  {delta.toFixed(1)} 分
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 风控摘要带 */}
        <div className="border-t border-slate-100 bg-amber-50/50">
          <div className="flex flex-col md:flex-row">
            <div className="flex items-center gap-3 border-b border-amber-200/50 p-4 md:w-1/3 md:border-b-0 md:border-r">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <AlertCircle size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">宏观环境风控与算法介入</div>
                <div className="text-xs text-amber-700/80">自动剔除不可复制的时代红利</div>
              </div>
            </div>
            <div className="p-4 text-sm leading-relaxed text-slate-700 md:w-2/3">
              <span className="font-semibold text-amber-800">环境校正提示:</span>
              {industryFactor !== undefined && (
                <>
                  {' '}行业景气因子 <strong className="text-slate-900">{industryFactor.toFixed(2)}×</strong>
                  {industryFactor < 1 ? '(回落)' : '(上行)'}
                </>
              )}
              {typeof aiRisk === 'number' && aiRisk > 0 && (
                <>
                  ;AI 替代风险扣减 <strong className="text-slate-900">{(aiRisk * 100).toFixed(0)}%</strong>
                </>
              )}
              {policyEvents.length > 0 && (
                <>
                  ;政策事件 <strong className="text-slate-900">{policyEvents.length} 项</strong>
                </>
              )}
              。系统已自动将以上因素折损,详见下方校正面板。
            </div>
          </div>
        </div>

        {/* Offer 切页(多 offer 时) */}
        <div className="border-t border-slate-100 px-6 py-3 md:px-10">
          <OfferTabs activeMatchId={matchId} />
        </div>
      </div>

      {/* 诚实声明:虚构 / 字典外公司没找到数据时,明确告知是相似公司参考 */}
      <MatchLevelBanner
        companyName={userOffer?.company_name}
        matchLevel={cd.match_level}
        sampleSize={cd.sample_size}
      />

      {/* 🌟 TL;DR 核心结论(一眼看完) */}
      <KeyTakeaways takeaway={takeaway} />

      {/* 筛选 */}
      <FiltersBar
        filters={filters}
        onChange={setFilters}
        totalCount={allPaths.length}
        filteredCount={filtered.length}
      />

      {/* ⭐ 你需要警惕的事(规则引擎) */}
      <div id="section-insights" className="scroll-mt-20">
        <InsightsPanel insights={insights} />
      </div>

      {/* ⭐ 环境校正(决赛胜负手) */}
      <div id="section-correction" className="scroll-mt-20">
      <CorrectionPanel
        original={cd.original_score ?? 0}
        corrected={cd.corrected_score ?? 0}
        factors={cd.factors ?? { industry: 1, ai_risk: 0, policy_events: [] }}
        explanation={cd.explanation ?? ''}
        sampleSize={cd.sample_size}
        avgSimilarity={cd.avg_similarity}
        salaryP10={cd.salary_p10}
        salaryP50={cd.salary_p50}
        salaryP90={cd.salary_p90}
        salaryBaseline={cd.salary_baseline}
        matchLevel={cd.match_level}
        aiSeniorSalary={aiSeniorSalary}
        aiLoading={aiLoading}
        aiBrief={aiBrief}
        onAiRetry={() => setAiNonce((n) => n + 1)}
      />
      </div>

      {/* 5 年时间轴 */}
      <div id="section-timeline" className="scroll-mt-20">
      <Card>
        <CardHeader className="space-y-2">
          <div>
            <CardTitle className="text-base">5 年时间轴:他们每年走到哪一步</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">实线 = 年薪走势,虚线 = 平均职级</p>
          </div>
          {(() => {
            const f = timelineFocus({ same, higher, lower, salaryScale });
            return <ChartHighlight text={f.text} tone={f.tone} />;
          })()}
        </CardHeader>
        <CardContent>
          <TimelineChart same={same} higher={higher} lower={lower} salaryScale={salaryScale} />
        </CardContent>
      </Card>
      </div>

      {/* 三组对比 + 薪资分布(桌面端 2 列横铺) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">同 / 高 / 低背景 5 年后的样子</CardTitle>
              <div className="flex gap-2 text-xs">
                <Badge variant="secondary">同 {same.length}</Badge>
                <Badge variant="outline">高 {higher.length}</Badge>
                <Badge variant="outline">低 {lower.length}</Badge>
              </div>
            </div>
            {(() => {
              const f = threeGroupFocus({ same: same.length, higher: higher.length, lower: lower.length });
              return <ChartHighlight text={f.text} tone={f.tone} />;
            })()}
          </CardHeader>
          <CardContent>
            <ThreeGroupChart same={same} higher={higher} lower={lower} salaryScale={salaryScale} />
          </CardContent>
        </Card>

        <Card id="section-salary" className="scroll-mt-20">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">5 年薪资分布</CardTitle>
            {(() => {
              const aiMid = aiBrief?.salary_range
                ? ((aiBrief.salary_range.senior_low + aiBrief.salary_range.senior_high) / 2) * 10_000
                : undefined;
              const f = salaryTrendFocus({ paths: filtered, salaryScale, aiMid });
              return <ChartHighlight text={f.text} tone={f.tone} />;
            })()}
          </CardHeader>
          <CardContent>
            <SalaryTrend paths={filtered} salaryScale={salaryScale} />
          </CardContent>
        </Card>
      </div>

      {/* 行业流向 */}
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">他们去了哪里(行业流向)</CardTitle>
          {(() => {
            const f = sankeyFocus({ paths: filtered });
            return <ChartHighlight text={f.text} tone={f.tone} />;
          })()}
        </CardHeader>
        <CardContent>
          <SankeyFlow paths={filtered} />
        </CardContent>
      </Card>

      {/* 单条路径列表 */}
      <div className="space-y-2">
        {(() => {
          // 算高契合(_fit >= 100,即至少同行业 / 或同 tier+同岗位)的师兄数
          const highFit = (listPaths as any[]).filter((p) => (p._fit ?? 0) >= 100).length;
          const f = pathsListFocus({
            totalCount: listPaths.length,
            baselineCount: Math.min(visiblePathCount, listPaths.length),
            highFitCount: highFit,
          });
          return <ChartHighlight text={f.text} tone={f.tone} />;
        })()}
        <PathsList
          paths={listPaths as any}
          visibleCount={visiblePathCount}
          totalCount={listPaths.length}
          onUpgradeClick={() => setPaywallOpen(true)}
          salaryScale={salaryScale}
        />
      </div>

      {/* 二级 CTA */}
      <div className="flex flex-col items-center gap-3 py-4">
        <Button size="xl" onClick={() => setPaywallOpen(true)}>
          解锁全部 200 条路径
        </Button>
      </div>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
      </div>
    </div>
  );
}

/** 从 user_offers 的 company_id + 候选 paths 反推行业(粗略,演示用) */
function inferIndustry(companyId: number | undefined, paths: SeniorPath[]): string | undefined {
  if (!companyId) return undefined;
  // 取最多人的 first_industry
  if (!paths.length) return undefined;
  const counter = new Map<string, number>();
  for (const p of paths) counter.set(p.first_industry, (counter.get(p.first_industry) ?? 0) + 1);
  return [...counter.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}
