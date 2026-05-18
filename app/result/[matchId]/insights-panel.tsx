/**
 * #4 自动总结面板 —— 基于规则引擎,告诉用户「你需要警惕的事」
 */
'use client';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Insight } from '@/lib/insights-engine';

const ICON_MAP = {
  info: Info,
  warn: AlertTriangle,
  danger: ShieldAlert,
};

const STYLE_MAP = {
  info: 'border-sky-200 bg-sky-50/50 text-sky-900',
  warn: 'border-amber-200 bg-amber-50/50 text-amber-900',
  danger: 'border-rose-200 bg-rose-50/50 text-rose-900',
};

const ICON_COLOR_MAP = {
  info: 'text-sky-500',
  warn: 'text-amber-500',
  danger: 'text-rose-500',
};

export default function InsightsPanel({ insights }: { insights: Insight[] }) {
  if (!insights.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📊 数据观察</CardTitle>
          <CardDescription>当前样本没有显著异常,这条路径看起来比较常规。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">你需要警惕的 {insights.length} 件事</CardTitle>
        <CardDescription>基于真实师兄数据 + 环境校正自动生成,不是 AI 写的话术。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((it) => {
          const Icon = ICON_MAP[it.level];
          return (
            <div
              key={it.id}
              className={cn('flex gap-3 rounded-lg border p-3 text-sm', STYLE_MAP[it.level])}
            >
              <Icon className={cn('mt-0.5 h-5 w-5 flex-shrink-0', ICON_COLOR_MAP[it.level])} />
              <div className="space-y-1">
                <p className="font-semibold">{it.title}</p>
                <p className="text-xs opacity-90">{it.detail}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
