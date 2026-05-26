/**
 * 「核心结论」TL;DR 卡片 —— 进结果页第一眼看到的东西
 * 一句话 + 3 大数字 + 1 条关键警示;数字卡片可锚点跳转到对应分析区
 */
'use client';
import { AlertTriangle, ChevronRight, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KeyTakeaway } from '@/lib/key-takeaways';

const TONE_CARD: Record<'good' | 'neutral' | 'bad', string> = {
  good: 'border-emerald-300/60 bg-emerald-50/70',
  neutral: 'border-slate-200 bg-white',
  bad: 'border-rose-300/60 bg-rose-50/70',
};
const TONE_VALUE: Record<'good' | 'neutral' | 'bad', string> = {
  good: 'text-emerald-700',
  neutral: 'text-slate-900',
  bad: 'text-rose-700',
};

const VERDICT_PILL: Record<KeyTakeaway['verdict'], { icon: typeof TrendingUp; label: string; cls: string }> = {
  good: { icon: TrendingUp, label: '整体偏正向', cls: 'border-emerald-300 bg-emerald-100 text-emerald-800' },
  neutral: { icon: ShieldCheck, label: '中等水位', cls: 'border-amber-300 bg-amber-100 text-amber-800' },
  bad: { icon: TrendingDown, label: '整体偏弱', cls: 'border-rose-300 bg-rose-100 text-rose-800' },
};

function scrollToAnchor(id?: string) {
  if (!id) return;
  const el = document.getElementById(`section-${id}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function KeyTakeaways({ takeaway }: { takeaway: KeyTakeaway }) {
  const verdict = VERDICT_PILL[takeaway.verdict];
  const VIcon = verdict.icon;

  return (
    <section className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', verdict.cls)}>
          <VIcon size={13} /> {verdict.label}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          TL;DR · 一眼看完
        </span>
      </div>
      <h2 className="mt-3 text-base font-bold leading-relaxed text-slate-900 md:text-lg">
        {takeaway.headline}
      </h2>

      {takeaway.cards.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {takeaway.cards.map((c) => (
            <button
              key={c.label}
              onClick={() => scrollToAnchor(c.anchor)}
              className={cn(
                'group flex flex-col items-start rounded-lg border p-3.5 text-left transition hover:shadow-md',
                TONE_CARD[c.tone],
              )}
            >
              <div className="text-xs font-medium text-slate-500">{c.label}</div>
              <div className={cn('mt-1 text-2xl font-black tracking-tight md:text-3xl', TONE_VALUE[c.tone])}>
                {c.value}
              </div>
              <div className="mt-1 line-clamp-2 text-xs leading-snug text-slate-600">{c.hint}</div>
              {c.anchor && (
                <div className="mt-2 inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-500 opacity-70 transition group-hover:opacity-100">
                  查看支撑数据 <ChevronRight size={11} />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {takeaway.topRisk && (
        <div
          className={cn(
            'mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm',
            takeaway.topRisk.level === 'danger'
              ? 'border-rose-200 bg-rose-50/60 text-rose-900'
              : takeaway.topRisk.level === 'warn'
              ? 'border-amber-200 bg-amber-50/60 text-amber-900'
              : 'border-sky-200 bg-sky-50/60 text-sky-900',
          )}
        >
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            <div className="font-semibold">{takeaway.topRisk.title}</div>
            <div className="text-xs opacity-90">{takeaway.topRisk.detail}</div>
          </div>
        </div>
      )}
    </section>
  );
}
