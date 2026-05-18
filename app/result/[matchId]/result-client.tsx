'use client';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ResultSkeleton } from './result-skeleton';
import OfferTabs from './offer-tabs';
import ThreeGroupChart from './three-group-chart';
import SalaryTrend from './salary-trend';
import SankeyFlow from './sankey-flow';
import CorrectionPanel from './correction-panel';
import PaywallModal from './paywall-modal';
import ShareCard from './share-card';
import InsightsPanel from './insights-panel';
import FiltersBar from './filters-bar';
import TimelineChart from './timeline-chart';
import PathsList from './paths-list';
import { EMPTY_FILTERS, applyFilters, type PathFilters } from '@/lib/path-filters';
import { generateInsights } from '@/lib/insights-engine';
import { PAYWALL } from '@/lib/constants';
import { formatSalary } from '@/lib/utils';
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

  const allPaths: SeniorPath[] = useMemo(() => match?.paths ?? [], [match?.paths]);
  const userOffer = match?.user_offers;

  // 用 user 的 school_tier 拆三组(以 same 组中位 tier 为基准)
  const baselineTier = useMemo(() => {
    if (!allPaths.length) return 3;
    // 取出现最频繁的 school_tier 作为基准
    const counter = new Map<number, number>();
    for (const p of allPaths) counter.set(p.school_tier, (counter.get(p.school_tier) ?? 0) + 1);
    return [...counter.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 3;
  }, [allPaths]);

  // 先应用 filter,再拆三组
  const filtered = useMemo(() => applyFilters(allPaths, filters), [allPaths, filters]);
  const { same, higher, lower } = useMemo(
    () => splitGroups(filtered, baselineTier),
    [filtered, baselineTier],
  );

  const insights = useMemo(
    () =>
      generateInsights({
        paths: filtered,
        correction: match?.correction_data,
        offerIndustry: inferIndustry(userOffer?.company_id, allPaths),
        offerPositionCategory: userOffer?.position_category,
      }),
    [filtered, match?.correction_data, userOffer, allPaths],
  );

  if (!match) return null;
  if (match.status === 'computing') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3 text-center text-sm text-brand-700">
          正在反推这个 offer,大概 5 秒…(已加载脱敏后的师兄路径)
        </div>
        <ResultSkeleton />
      </div>
    );
  }
  if (match.status === 'failed') {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm">
        <p className="font-semibold text-destructive">反推失败</p>
        <p className="mt-1 text-muted-foreground">{match.error_message}</p>
        <Button asChild className="mt-4">
          <Link href="/input">重新提交</Link>
        </Button>
      </div>
    );
  }

  const visiblePathCount = paid ? PAYWALL.PAID_PATHS_VISIBLE : PAYWALL.FREE_PATHS_VISIBLE;
  const cd = match.correction_data ?? {};

  return (
    <div className="space-y-6">
      {/* offer 概要 */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                {userOffer?.company_name ?? `#${userOffer?.company_id}`}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {userOffer?.position_category} · {userOffer?.level}
                {userOffer?.salary_min
                  ? ` · ${formatSalary(userOffer.salary_min)} - ${formatSalary(userOffer.salary_max)}`
                  : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <ShareCard matchId={matchId} />
            </div>
          </div>
          <OfferTabs activeMatchId={matchId} />
        </CardHeader>
      </Card>

      {/* 筛选 */}
      <FiltersBar
        filters={filters}
        onChange={setFilters}
        totalCount={allPaths.length}
        filteredCount={filtered.length}
      />

      {/* ⭐ 你需要警惕的事(规则引擎) */}
      <InsightsPanel insights={insights} />

      {/* ⭐ 环境校正(决赛胜负手) */}
      <CorrectionPanel
        original={cd.original_score ?? 0}
        corrected={cd.corrected_score ?? 0}
        factors={cd.factors ?? { industry: 1, ai_risk: 0, policy_events: [] }}
        explanation={cd.explanation ?? ''}
      />

      {/* 5 年时间轴 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">5 年时间轴:他们每年走到哪一步</CardTitle>
          <p className="text-xs text-muted-foreground">实线 = 年薪走势,虚线 = 平均职级</p>
        </CardHeader>
        <CardContent>
          <TimelineChart same={same} higher={higher} lower={lower} />
        </CardContent>
      </Card>

      {/* 三组对比 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">同 / 高 / 低背景 5 年后的样子</CardTitle>
            <div className="flex gap-2 text-xs">
              <Badge variant="secondary">同 {same.length}</Badge>
              <Badge variant="outline">高 {higher.length}</Badge>
              <Badge variant="outline">低 {lower.length}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ThreeGroupChart
            same={same.length}
            higher={higher.length}
            lower={lower.length}
            paths={filtered}
          />
        </CardContent>
      </Card>

      {/* 薪资分布 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">5 年薪资分布</CardTitle>
        </CardHeader>
        <CardContent>
          <SalaryTrend paths={filtered} />
        </CardContent>
      </Card>

      {/* 行业流向 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">他们去了哪里(行业流向)</CardTitle>
        </CardHeader>
        <CardContent>
          <SankeyFlow paths={filtered} />
        </CardContent>
      </Card>

      {/* 单条路径列表 */}
      <PathsList
        paths={filtered}
        visibleCount={visiblePathCount}
        totalCount={filtered.length}
        onUpgradeClick={() => setPaywallOpen(true)}
      />

      {/* 二级 CTA */}
      <div className="flex flex-col items-center gap-3 py-4">
        <Button size="xl" onClick={() => setPaywallOpen(true)}>
          解锁全部 200 条路径
        </Button>
      </div>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
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
