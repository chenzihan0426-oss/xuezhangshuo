/**
 * #1 单条路径列表 + 点击展开详情
 */
'use client';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { COMPANY_TIER_LABELS, LEVEL_LABELS, SCHOOL_TIER_LABELS, schoolNameFor } from '@/lib/constants';
import { formatSalary } from '@/lib/utils';
import type { SeniorPath } from '@/lib/types';
import PathDetailModal from './path-detail-modal';

/** 由 result-client 的 computeFit 写入,数字越大越契合用户的 offer 起点 */
type ScoredPath = SeniorPath & { _fit?: number };

function fitBadge(fit: number | undefined): { label: string; variant: 'success' | 'secondary' | 'warning' | 'outline' } {
  if (fit === undefined) return { label: '相关', variant: 'outline' };
  if (fit >= 130) return { label: '高契合 · 同行业同 tier', variant: 'success' };
  if (fit >= 100) return { label: '同行业起步', variant: 'success' };
  if (fit >= 50) return { label: '同 tier 起步', variant: 'secondary' };
  if (fit >= 30) return { label: '同岗位类目', variant: 'secondary' };
  return { label: '参考用 · 起点不同', variant: 'warning' };
}

export default function PathsList({
  paths,
  visibleCount,
  totalCount,
  onUpgradeClick,
  salaryScale = 1,
}: {
  paths: ScoredPath[];
  visibleCount: number;
  totalCount: number;
  onUpgradeClick: () => void;
  salaryScale?: number;
}) {
  const [selected, setSelected] = useState<SeniorPath | null>(null);
  const visible = paths.slice(0, visibleCount);
  const locked = Math.max(0, totalCount - visibleCount);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">逐条看真实师兄路径</CardTitle>
          <CardDescription>
            点任意一行展开 5 年完整时间线。{locked > 0 && `(还有 ${locked} 条解锁后可见)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {visible.map((p, i) => {
            const history = (p.path_history ?? []) as Array<any>;
            const firstCompanyName = history[0]?.company_name;
            const lastCompanyName = history[history.length - 1]?.company_name;
            const lastPositionName = history[history.length - 1]?.position_name;
            const isStartup = p.first_company_tier === 7;
            const fit = fitBadge(p._fit);
            const lowFit = (p._fit ?? 0) < 30;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left text-sm transition hover:border-brand-500 hover:bg-brand-50/30 ${
                  isStartup ? 'border-amber-300 bg-amber-50/30' : ''
                } ${lowFit ? 'opacity-70' : ''}`}
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium">
                      {isStartup && <span className="mr-1" aria-label="创业">🚀</span>}
                      匿名师兄 #{i + 1}
                    </span>
                    <Badge variant={fit.variant}>{fit.label}</Badge>
                    {p.school_tier && (
                      <Badge variant="outline">
                        {schoolNameFor(p.id, p.school_tier)}
                        <span className="ml-1 opacity-60">{SCHOOL_TIER_LABELS[p.school_tier]}</span>
                      </Badge>
                    )}
                    {p.education_level && <Badge variant="outline">{p.education_level}</Badge>}
                    {isStartup && <Badge variant="warning">创业起步</Badge>}
                    <span className="text-xs text-muted-foreground">· {p.start_year} 入职</span>
                    <span className="font-bold text-brand-700">
                      {firstCompanyName ?? COMPANY_TIER_LABELS[p.first_company_tier ?? 5]}
                    </span>
                    <span className="text-xs text-muted-foreground">→ 5 年后</span>
                    <span className="font-bold text-foreground">
                      {lastCompanyName ?? COMPANY_TIER_LABELS[p.five_year_company_tier ?? 5]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                    <Badge variant="outline">
                      {lastPositionName ?? p.first_position_category}
                    </Badge>
                    <Badge variant="secondary">
                      {LEVEL_LABELS[p.five_year_level ?? 'mid']}
                    </Badge>
                    <Badge variant="secondary">
                      {p.five_year_salary
                        ? formatSalary(Math.round(p.five_year_salary * salaryScale))
                        : '-'}
                    </Badge>
                    {p.job_changes > 0 && <Badge variant="warning">跳 {p.job_changes} 次</Badge>}
                    {p.industry_changes > 0 && (
                      <Badge variant="warning">换行 {p.industry_changes} 次</Badge>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </button>
            );
          })}

          {locked > 0 && (
            <button
              onClick={onUpgradeClick}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-sm text-muted-foreground hover:border-brand-500 hover:text-brand-700"
            >
              🔒 还有 {locked} 条路径未解锁,点击查看
            </button>
          )}

          {visible.length === 0 && (
            <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
              <p className="text-2xl">🔍</p>
              <p className="mt-2 text-sm font-medium">当前筛选下没有匹配的师兄</p>
              <p className="mt-1 text-xs text-muted-foreground">
                试试放宽条件,或者清空所有筛选。
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <PathDetailModal open={!!selected} path={selected} onClose={() => setSelected(null)} salaryScale={salaryScale} />
    </>
  );
}
