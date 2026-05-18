/**
 * ⭐ 环境校正对比面板 —— 决赛胜负手
 *
 * 设计目标:让评委一眼看到"我们扣掉了上一代人的红利"
 */
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactECharts from 'echarts-for-react';

export default function CorrectionPanel({
  original,
  corrected,
  factors,
  explanation,
}: {
  original: number;
  corrected: number;
  factors: { industry: number; ai_risk: number; policy_events: string[] };
  explanation: string;
}) {
  const delta = corrected - original;
  const isDown = delta < 0;

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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              ⭐ 环境校正:扣掉上一代人的红利
            </CardTitle>
            <CardDescription>
              因为 5 年前的行业环境 / AI 风险 / 政策事件,实际能复制的概率更{isDown ? '低' : '高'}
            </CardDescription>
          </div>
          <Badge variant={isDown ? 'destructive' : 'success'}>
            {delta > 0 ? '+' : ''}
            {delta.toFixed(1)} 分
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <ReactECharts option={option} style={{ height: 220 }} />
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <Factor label="行业景气" value={`${(factors.industry * 100).toFixed(0)}%`}
              warn={factors.industry < 0.8} />
            <Factor label="AI 风险" value={`${(factors.ai_risk * 100).toFixed(0)}%`}
              warn={factors.ai_risk >= 0.6} />
            <Factor label="政策事件" value={`${factors.policy_events.length} 个`}
              warn={factors.policy_events.length > 0} />
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
          <p className="rounded-md bg-white p-3 text-sm">{explanation}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Factor({ label, value, warn }: { label: string; value: string; warn: boolean }) {
  return (
    <div className={`rounded-md border p-2 ${warn ? 'border-amber-300 bg-amber-50' : 'border-muted bg-white'}`}>
      <div className="text-muted-foreground">{label}</div>
      <div className={`mt-1 text-base font-semibold ${warn ? 'text-amber-700' : 'text-foreground'}`}>{value}</div>
    </div>
  );
}
