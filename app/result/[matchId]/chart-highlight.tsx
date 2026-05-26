/**
 * 图表卡片顶部「该图重点」提示行 —— 把图里最值得看的一个数字写在前面
 */
'use client';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChartHighlight({
  text,
  tone = 'info',
  className,
}: {
  text: string;
  tone?: 'info' | 'warn' | 'good';
  className?: string;
}) {
  const styles =
    tone === 'warn'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : tone === 'good'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : 'border-sky-200 bg-sky-50/70 text-sky-900';
  return (
    <div
      className={cn(
        'flex items-start gap-1.5 rounded-md border px-2.5 py-1.5 text-xs leading-snug',
        styles,
        className,
      )}
    >
      <Sparkles size={12} className="mt-0.5 flex-shrink-0 opacity-70" />
      <span>
        <span className="mr-1 font-semibold">该图重点:</span>
        {text}
      </span>
    </div>
  );
}
