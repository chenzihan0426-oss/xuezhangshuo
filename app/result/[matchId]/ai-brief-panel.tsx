/**
 * 🤖 AI 联网行业动态 —— 内容片段(无 Card 外壳),嵌入合并后的环境校正卡片。
 *
 * AI 只解读联网到的真实信息,不影响校正分数。
 * 每条事件都带真实来源链接(后端已用 search_info 白名单过滤,编造的展示不出来)。
 */
'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface AiBrief {
  found: boolean;
  summary: string;
  events: { title: string; date: string | null; source_url: string }[];
  career_outlook?: string;
  salary_range?: {
    fresh_low: number;
    fresh_high: number;
    senior_low: number;
    senior_high: number;
    basis: string;
  } | null;
  correction?: {
    company_adjustment: number;
    rationale: string;
    dimension_notes?: { industry?: string; ai_risk?: string; policy?: string };
  } | null;
  sources?: { title: string; url: string; site_name?: string }[];
  degraded?: 'no_key' | 'timeout' | 'error';
}

export function AiBriefContent({
  brief,
  loading,
  onRetry,
}: {
  brief: AiBrief | null;
  loading: boolean;
  onRetry: () => void;
}) {
  const header = (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <span className="font-semibold">🤖 AI 联网行业动态</span>
      <Badge variant="secondary">AI 联网生成</Badge>
      <span className="text-xs text-muted-foreground">可能有误,请点击来源核实</span>
    </div>
  );

  if (loading) {
    return (
      <div>
        {header}
        <p className="text-sm text-muted-foreground">正在联网检索该公司近期动态与市场薪资…(约 30-60 秒,请稍候)</p>
        <div className="mt-3 space-y-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-sky-100" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-sky-100" />
        </div>
      </div>
    );
  }

  if (!brief) return null;

  if (brief.degraded === 'no_key') {
    return (
      <div>
        {header}
        <p className="text-sm text-muted-foreground">
          演示环境未接入联网检索,正式版会在这里展示该公司的实时动态(裁员 / 扩招 / 政策 / 经营变化)与市场薪资。
        </p>
      </div>
    );
  }
  if (brief.degraded === 'timeout' || brief.degraded === 'error') {
    return (
      <div>
        {header}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {brief.degraded === 'timeout' ? '联网检索超时' : '检索暂时失败'},可稍后重试。
          </p>
          <Button size="sm" variant="outline" onClick={onRetry}>
            重试
          </Button>
        </div>
      </div>
    );
  }

  const sr = brief.salary_range;
  if (!brief.found && !sr) {
    return (
      <div>
        {header}
        <p className="text-sm text-muted-foreground">
          未检索到该公司近期公开动态。下方环境校正基于行业历史数据,仍然有效。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {header}
      {sr && (
        <div className="rounded-md border border-sky-200 bg-white p-3">
          <div className="mb-1.5 font-semibold">💰 市场参考薪资(AI 联网估算)</div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span>
              应届起薪:<b className="text-sky-700">{sr.fresh_low}–{sr.fresh_high} 万/年</b>
            </span>
            <span>
              工作 5 年后:<b className="text-sky-700">{sr.senior_low}–{sr.senior_high} 万/年</b>
            </span>
          </div>
          {sr.basis && <p className="mt-1 text-xs text-muted-foreground">依据:{sr.basis}</p>}
        </div>
      )}
      {brief.summary && <p className="rounded-md bg-white p-3">{brief.summary}</p>}

      {brief.events.length > 0 && (
        <div className="space-y-2">
          {brief.events.map((ev, i) => (
            <a
              key={i}
              href={ev.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-md border bg-white p-3 transition hover:border-sky-400 hover:bg-sky-50/50"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{ev.title}</span>
                {ev.date && <span className="flex-shrink-0 text-xs text-muted-foreground">{ev.date}</span>}
              </div>
              <span className="mt-1 block truncate text-xs text-sky-600">{ev.source_url}</span>
            </a>
          ))}
        </div>
      )}

      {brief.career_outlook && (
        <div className="rounded-md bg-muted/40 p-3 text-muted-foreground">
          <span className="font-semibold text-foreground">职业展望:</span> {brief.career_outlook}
        </div>
      )}
    </div>
  );
}
