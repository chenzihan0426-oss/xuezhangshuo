/**
 * #2 筛选维度
 *
 * 客户端纯前端过滤(数据已加载),所有图表 / insights / 路径列表实时联动。
 */
'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EMPTY_FILTERS, type PathFilters, describeFilters } from '@/lib/path-filters';
import { X } from 'lucide-react';

interface Option {
  key: string;
  label: string;
  patch: Partial<PathFilters>;
}

const QUICK_FILTERS: Option[] = [
  { key: 'switched', label: '只看转行的', patch: { onlySwitchedIndustry: true } },
  { key: 'jumpy', label: '跳槽 ≥ 2 次', patch: { minJobChanges: 2 } },
  { key: 'stable', label: '从未跳槽', patch: { minJobChanges: 0, maxJobChanges: 0 } },
  { key: 'stayed', label: '留在同 tier', patch: { onlyStayed: true } },
  { key: 'salary300k', label: '年薪 ≥ 30 万', patch: { minSalary: 300_000 } },
  { key: 'salary500k', label: '年薪 ≥ 50 万', patch: { minSalary: 500_000 } },
];

const START_YEARS = [2019, 2020, 2021];

export default function FiltersBar({
  filters,
  onChange,
  totalCount,
  filteredCount,
}: {
  filters: PathFilters;
  onChange: (f: PathFilters) => void;
  totalCount: number;
  filteredCount: number;
}) {
  const tags = describeFilters(filters);
  const isActive = (opt: Option) =>
    Object.entries(opt.patch).every(([k, v]) => (filters as any)[k] === v);

  function togglePatch(patch: Partial<PathFilters>) {
    const allMatch = Object.entries(patch).every(([k, v]) => (filters as any)[k] === v);
    if (allMatch) {
      const next = { ...filters };
      for (const k of Object.keys(patch)) delete (next as any)[k];
      onChange(next);
    } else {
      onChange({ ...filters, ...patch });
    }
  }

  return (
    <div className="rounded-xl border bg-card p-3 space-y-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-semibold">{filteredCount}</span>
          <span className="text-muted-foreground"> / {totalCount} 位师兄</span>
          {tags.length > 0 && (
            <span className="ml-2 inline-flex flex-wrap gap-1 text-xs text-muted-foreground">
              · 已筛选
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="ml-0.5">{t}</Badge>
              ))}
            </span>
          )}
        </div>
        {tags.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => onChange(EMPTY_FILTERS)}>
            <X className="mr-1 h-3 w-3" /> 清空
          </Button>
        )}
      </div>

      {/* 横向滚动条:小屏自动 overflow,大屏 flex-wrap */}
      <div className="-mx-3 overflow-x-auto px-3 sm:overflow-visible">
        <div className="flex min-w-max gap-2 sm:min-w-0 sm:flex-wrap">
          {QUICK_FILTERS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => togglePatch(opt.patch)}
              className={cn(
                'whitespace-nowrap rounded-full border px-3 py-1 text-xs transition',
                isActive(opt)
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-muted bg-background text-muted-foreground hover:border-brand-300',
              )}
            >
              {opt.label}
            </button>
          ))}

          <div className="ml-2 flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
            起步年份:
          </div>
          {START_YEARS.map((y) => {
            const active = filters.startYear === y;
            return (
              <button
                key={y}
                onClick={() => onChange({ ...filters, startYear: active ? undefined : y })}
                className={cn(
                  'whitespace-nowrap rounded-full border px-3 py-1 text-xs',
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-muted bg-background text-muted-foreground hover:border-brand-300',
                )}
              >
                {y}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
