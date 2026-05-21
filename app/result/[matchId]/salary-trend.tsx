'use client';
import ReactECharts from 'echarts-for-react';
import { quantile } from '@/lib/utils';
import { useIsMobile } from '@/lib/use-is-mobile';

export default function SalaryTrend({ paths, salaryScale = 1 }: { paths: any[]; salaryScale?: number }) {
  const isMobile = useIsMobile();
  if (!paths.length) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        当前筛选下没有数据
      </div>
    );
  }
  // 把薪资分桶(以 10 万为单位),画分布。salaryScale 把 mock 量级对齐到 AI 市场水平。
  const buckets = new Map<number, number>();
  const salaries: number[] = [];
  for (const p of paths) {
    const s = (p.five_year_salary ?? 0) * salaryScale;
    if (s > 0) salaries.push(s);
    const b = Math.floor(s / 100000) * 10; // bucket = 10 万 / 20 万 / ...
    buckets.set(b, (buckets.get(b) ?? 0) + 1);
  }
  const sorted = [...buckets.entries()].sort((a, b) => a[0] - b[0]);

  // 计算 P10/P50/P90 分位,叠加为 markLine
  const hasEnough = salaries.length >= 5;
  const p10 = hasEnough ? quantile(salaries, 0.1) : 0;
  const p50 = hasEnough ? quantile(salaries, 0.5) : 0;
  const p90 = hasEnough ? quantile(salaries, 0.9) : 0;

  // 把分位数映射到 x 轴的 bucket index(连续)
  const findBucketIdx = (salary: number): number => {
    const b = Math.floor(salary / 100000) * 10;
    return sorted.findIndex(([k]) => k === b);
  };

  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 30, bottom: 30, top: 50 },
    xAxis: {
      type: 'category',
      data: sorted.map(([k]) => `${k}-${k + 10} 万`),
      axisLabel: { rotate: 30 },
    },
    yAxis: { type: 'value', name: '人数' },
    series: [
      {
        type: 'bar',
        data: sorted.map(([, v]) => v),
        itemStyle: { color: '#3b82f6' },
        barWidth: 32,
        markLine: hasEnough
          ? {
              symbol: 'none',
              label: {
                formatter: (p: { name: string }) => p.name,
                fontSize: 10,
              },
              lineStyle: { type: 'dashed' },
              data: [
                {
                  name: `P10 ${(p10 / 10000).toFixed(0)} 万`,
                  xAxis: findBucketIdx(p10),
                  lineStyle: { color: '#94a3b8' },
                },
                {
                  name: `中位 ${(p50 / 10000).toFixed(0)} 万`,
                  xAxis: findBucketIdx(p50),
                  lineStyle: { color: '#16a34a', width: 2 },
                },
                {
                  name: `P90 ${(p90 / 10000).toFixed(0)} 万`,
                  xAxis: findBucketIdx(p90),
                  lineStyle: { color: '#94a3b8' },
                },
              ],
            }
          : undefined,
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: isMobile ? 240 : 280 }} />;
}
