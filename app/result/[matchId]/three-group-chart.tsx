'use client';
import ReactECharts from 'echarts-for-react';
import { mean } from '@/lib/utils';
import { useIsMobile } from '@/lib/use-is-mobile';

export default function ThreeGroupChart({
  same, higher, lower, paths,
}: {
  same: number;
  higher: number;
  lower: number;
  paths: any[];
}) {
  const isMobile = useIsMobile();
  if (!paths.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        当前筛选下没有数据
      </div>
    );
  }

  // 把 paths 按 school_tier 粗分,算 5 年平均薪资
  const sameSalary = mean(paths.filter((p) => p.school_tier === paths[0]?.school_tier).map((p) => p.five_year_salary ?? 0));
  const higherSalary = mean(paths.filter((p) => (p.school_tier ?? 5) < (paths[0]?.school_tier ?? 5)).map((p) => p.five_year_salary ?? 0));
  const lowerSalary = mean(paths.filter((p) => (p.school_tier ?? 5) > (paths[0]?.school_tier ?? 5)).map((p) => p.five_year_salary ?? 0));

  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['人数', '5 年平均年薪(万)'] },
    grid: { left: 50, right: 50, bottom: 30, top: 40 },
    xAxis: { type: 'category', data: ['更高背景', '同背景', '更低背景'] },
    yAxis: [
      { type: 'value', name: '人数', position: 'left' },
      { type: 'value', name: '万元', position: 'right' },
    ],
    series: [
      { name: '人数', type: 'bar', data: [higher, same, lower], itemStyle: { color: '#94a3b8' } },
      {
        name: '5 年平均年薪(万)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 10,
        lineStyle: { width: 3, color: '#2563eb' },
        itemStyle: { color: '#2563eb' },
        data: [Math.round(higherSalary / 10000), Math.round(sameSalary / 10000), Math.round(lowerSalary / 10000)],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: isMobile ? 260 : 320 }} />;
}
