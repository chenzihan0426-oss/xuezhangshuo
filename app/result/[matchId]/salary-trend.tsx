'use client';
import ReactECharts from 'echarts-for-react';

export default function SalaryTrend({ paths }: { paths: any[] }) {
  if (!paths.length) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        当前筛选下没有数据
      </div>
    );
  }
  // 把薪资分桶(以 10 万为单位),画分布
  const buckets = new Map<number, number>();
  for (const p of paths) {
    const s = p.five_year_salary ?? 0;
    const b = Math.floor(s / 100000) * 10; // bucket = 10 万 / 20 万 / ...
    buckets.set(b, (buckets.get(b) ?? 0) + 1);
  }
  const sorted = [...buckets.entries()].sort((a, b) => a[0] - b[0]);

  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 30, bottom: 30, top: 40 },
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
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 280 }} />;
}
