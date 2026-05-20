/**
 * ⭐ 环境校正对比面板 —— 决赛胜负手 (v2)
 *
 * 因子展示:行业景气 / AI 风险 / 政策事件 / 时代红利 / 起点加成 / Offer 薪资
 * 顶部:可信度 badge(样本量 + 背景相似度)
 * 底部:5 年薪资 P10-P90 区间(辅助 SalaryTrend)
 */
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactECharts from 'echarts-for-react';
import { formatSalary } from '@/lib/utils';
import { AiBriefContent, type AiBrief } from './ai-brief-panel';

export interface CorrectionFactors {
  industry: number;
  ai_risk: number;
  policy_events: string[];
  cohort?: number;
  personal_boost?: number;
  offer_salary?: number;
}

export type MatchLevel =
  | 'exact_company_position'
  | 'same_company_any_position'
  | 'same_tier_industry_position'
  | 'same_tier_position'
  | 'position_only';

const MATCH_LEVEL_DESC: Record<MatchLevel, { label: string; tone: 'success' | 'warning' | 'secondary' }> = {
  exact_company_position: { label: '同公司 + 同岗位起步', tone: 'success' },
  same_company_any_position: { label: '同公司起步(岗位不限)', tone: 'success' },
  same_tier_industry_position: { label: '同档次 + 同行业 + 同岗位起步', tone: 'warning' },
  same_tier_position: { label: '同档次 + 同岗位(放宽行业)', tone: 'warning' },
  position_only: { label: '仅同岗位类目(精度较低)', tone: 'secondary' },
};

export default function CorrectionPanel({
  original,
  corrected,
  factors,
  explanation,
  sampleSize,
  avgSimilarity,
  salaryP10,
  salaryP50,
  salaryP90,
  salaryBaseline,
  matchLevel,
  aiSeniorSalary,
  aiLoading,
  aiBrief,
  onAiRetry,
}: {
  original: number;
  corrected: number;
  factors: CorrectionFactors;
  explanation: string;
  sampleSize?: number;
  avgSimilarity?: number;
  salaryP10?: number;
  salaryP50?: number;
  salaryP90?: number;
  salaryBaseline?: number;
  matchLevel?: MatchLevel;
  /** AI 联网市场薪资(senior 区间,元/年)。有则"5 年后薪资"用它,与 AI 区块同源一致 */
  aiSeniorSalary?: { low: number; high: number };
  /** AI 联网简报是否还在加载;加载中先不显示校正,等 AI 事实出来再一起呈现 */
  aiLoading?: boolean;
  /** AI 联网简报数据(嵌入本卡片顶部) */
  aiBrief?: AiBrief | null;
  /** AI 检索重试 */
  onAiRetry?: () => void;
}) {
  const delta = corrected - original;
  const isDown = delta < 0;
  const cohort = factors.cohort ?? 1;
  const personal = factors.personal_boost ?? 1;
  const offerSalary = factors.offer_salary ?? 1;

  const option = {
    grid: { left: 60, right: 30, bottom: 30, top: 40 },
    xAxis: { type: 'category', data: ['原始评分', '环境校正后'] },
    yAxis: { type: 'value', max: 100 },
    tooltip: { trigger: 'axis' },
    series: [
      {
        type: 'bar',
        barWidth: 60,
        data: [
          { value: original, itemStyle: { color: '#94a3b8' } },
          { value: corrected, itemStyle: { color: isDown ? '#dc2626' : '#16a34a' } },
        ],
        label: { show: true, position: 'top', formatter: '{c}' },
      },
    ],
  };

  return (
    <Card className="border-amber-300 bg-amber-50/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              ⭐ 环境校正:扣掉上一代人的红利
            </CardTitle>
            <CardDescription>
              因为 5 年前的行业环境 / AI 风险 / 政策 / 校招供需 / 你的起点,实际能复制的概率更{isDown ? '低' : '高'}
            </CardDescription>
            {(sampleSize !== undefined || avgSimilarity !== undefined || matchLevel) && (
              <ConfidenceBadge
                sampleSize={sampleSize}
                avgSimilarity={avgSimilarity}
                matchLevel={matchLevel}
              />
            )}
          </div>
          {!aiLoading && (
            <Badge variant={isDown ? 'destructive' : 'success'}>
              {delta > 0 ? '+' : ''}
              {delta.toFixed(1)} 分
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ① 先呈现 AI 联网的真实最新事实 */}
        <div className="rounded-lg border border-sky-200 bg-sky-50/40 p-3">
          <AiBriefContent brief={aiBrief ?? null} loading={!!aiLoading} onRetry={onAiRetry ?? (() => {})} />
        </div>

        {/* ② 基于环境因子的校正结论(等 AI 事实出来再一起呈现,避免割裂/跳变) */}
        {aiLoading ? (
          <div className="space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-amber-100" />
            <div className="grid gap-3 md:grid-cols-2">
              <div className="h-48 animate-pulse rounded bg-amber-50" />
              <div className="h-48 animate-pulse rounded bg-amber-50" />
            </div>
          </div>
        ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <ReactECharts option={option} style={{ height: 220 }} />
          <div className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <Factor label="行业景气" value={`${(factors.industry * 100).toFixed(0)}%`}
              warn={factors.industry < 0.8} />
            <Factor label="AI 风险" value={`${(factors.ai_risk * 100).toFixed(0)}%`}
              warn={factors.ai_risk >= 0.6} />
            <Factor label="政策事件" value={`${factors.policy_events.length} 个`}
              warn={factors.policy_events.length > 0} />
            <Factor label="时代红利" value={`${(cohort * 100).toFixed(0)}%`}
              warn={cohort < 0.85}
              good={cohort > 1.15} />
            <Factor label="起点加成" value={`${(personal * 100).toFixed(0)}%`}
              good={personal > 1.05}
              warn={personal < 0.97} />
            <Factor label="Offer 薪资" value={`${(offerSalary * 100).toFixed(0)}%`}
              good={offerSalary > 1.1}
              warn={offerSalary < 0.9} />
          </div>
          {factors.policy_events.length > 0 && (
            <div className="rounded-md bg-white p-3 text-xs">
              <div className="mb-1 font-semibold">影响事件:</div>
              <div className="flex flex-wrap gap-1">
                {factors.policy_events.map((e) => (
                  <Badge key={e} variant="warning">{e}</Badge>
                ))}
              </div>
            </div>
          )}
          {(() => {
            // 校正区块本身已等 AI 加载完才渲染,这里直接判定来源:有 AI 用 AI,否则 mock
            const useAi = !!aiSeniorSalary;
            const low = useAi ? aiSeniorSalary!.low : salaryP10;
            const mid = useAi ? Math.round((aiSeniorSalary!.low + aiSeniorSalary!.high) / 2) : salaryP50;
            const high = useAi ? aiSeniorSalary!.high : salaryP90;
            if (!low && !mid && !high) return null;
            return (
              <div className="rounded-md bg-white p-3 text-xs">
                <div className="mb-1 font-semibold">
                  5 年后薪资:同岗位大多落在这个区间
                  {useAi && <span className="ml-1 font-normal text-sky-600">· 市场参考</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">偏低 {formatSalary(low)}</Badge>
                  <Badge>中位 {formatSalary(mid)}</Badge>
                  <Badge variant="outline">偏高 {formatSalary(high)}</Badge>
                </div>
                <p className="mt-1.5 leading-snug text-muted-foreground">
                  {useAi
                    ? '区间取自下方 AI 联网检索的市场薪资,与师兄路径相互校准。'
                    : '每 10 位师兄里:约 1 位低于「偏低」,一半在「中位」上下,只有约 1 位能超过「偏高」。'}
                  {!useAi && <span className="ml-1 opacity-70">(统计学 P10 / 中位 / P90)</span>}
                </p>
                {!useAi && salaryBaseline ? (
                  <p className="mt-1 text-muted-foreground">
                    起薪基准(同岗位中位):{formatSalary(salaryBaseline)}
                  </p>
                ) : null}
              </div>
            );
          })()}
          <p className="rounded-md bg-white p-3 text-sm">{explanation}</p>
          {personal !== 1 && (
            <p className="text-[10px] leading-snug text-muted-foreground">
              「起点加成」基于历史数据观察(学校层级 × 学历 × GPA × 实习经历)对长期发展的相关性,
              不代表对个人能力的评价。
            </p>
          )}
        </div>
        </div>
        )}
      </CardContent>
    </Card>
  );
}

function Factor({
  label,
  value,
  warn,
  good,
}: {
  label: string;
  value: string;
  warn?: boolean;
  good?: boolean;
}) {
  const tone = warn
    ? 'border-amber-300 bg-amber-50'
    : good
    ? 'border-emerald-300 bg-emerald-50'
    : 'border-muted bg-white';
  const textTone = warn ? 'text-amber-700' : good ? 'text-emerald-700' : 'text-foreground';
  return (
    <div className={`rounded-md border p-2 ${tone}`}>
      <div className="text-muted-foreground">{label}</div>
      <div className={`mt-1 text-base font-semibold ${textTone}`}>{value}</div>
    </div>
  );
}

function ConfidenceBadge({
  sampleSize,
  avgSimilarity,
  matchLevel,
}: {
  sampleSize?: number;
  avgSimilarity?: number;
  matchLevel?: MatchLevel;
}) {
  // 可信度主要看样本量(50+ 高,15+ 中,否则低);sim 作为辅助维度展示
  const n = sampleSize ?? 0;
  const tone = n >= 50 ? 'success' : n >= 15 ? 'warning' : 'secondary';
  const text = n >= 50 ? '高可信' : n >= 15 ? '中可信' : '样本偏少';
  const sim = avgSimilarity ?? 0;
  const matchDesc = matchLevel ? MATCH_LEVEL_DESC[matchLevel] : null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <Badge variant={tone}>
        {text} · 基于 {n} 条师兄路径
      </Badge>
      {matchDesc && (
        <Badge variant={matchDesc.tone}>匹配维度:{matchDesc.label}</Badge>
      )}
      {sim > 0 && (
        <span className="text-muted-foreground">背景相似度中位 {(sim * 100).toFixed(0)}%</span>
      )}
    </div>
  );
}
