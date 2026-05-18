/**
 * #1 单条路径列表 + 点击展开详情
 */
'use client';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { COMPANY_TIER_LABELS, LEVEL_LABELS } from '@/lib/constants';
import { formatSalary } from '@/lib/utils';
import type { SeniorPath } from '@/lib/types';
import PathDetailModal from './path-detail-modal';

const INDUSTRY_LABEL: Record<string, string> = {
  internet: '互联网',
  finance: '金融',
  tech_hardware: '硬件',
  education_training: '教培',
  real_estate: '地产',
  auto_ev: '新能源车',
  telecom: '通信',
  energy: '能源',
  consulting: '咨询',
  startup: '创业',
};

export default function PathsList({
  paths,
  visibleCount,
  totalCount,
  onUpgradeClick,
}: {
  paths: SeniorPath[];
  visibleCount: number;
  totalCount: number;
  onUpgradeClick: () => void;
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
          {visible.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left text-sm transition hover:border-brand-500 hover:bg-brand-50/30"
            >
              <div className="space-y-1">
                <div className="font-medium">
                  匿名师兄 #{i + 1} · {p.start_year} 入职
                </div>
                <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                  <Badge variant="outline">起:{COMPANY_TIER_LABELS[p.first_company_tier ?? 5]}</Badge>
                  <Badge variant="outline">{INDUSTRY_LABEL[p.first_industry] ?? p.first_industry}</Badge>
                  <Badge variant="outline">{LEVEL_LABELS[p.first_level] ?? p.first_level}</Badge>
                  <span>→</span>
                  <Badge variant="secondary">
                    5 年后 · {LEVEL_LABELS[p.five_year_level ?? 'mid']}
                  </Badge>
                  <Badge variant="secondary">{formatSalary(p.five_year_salary)}</Badge>
                  {p.job_changes > 0 && <Badge variant="warning">跳 {p.job_changes} 次</Badge>}
                  {p.industry_changes > 0 && (
                    <Badge variant="warning">换行 {p.industry_changes} 次</Badge>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </button>
          ))}

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

      <PathDetailModal open={!!selected} path={selected} onClose={() => setSelected(null)} />
    </>
  );
}
