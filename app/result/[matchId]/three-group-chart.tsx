'use client';
import ReactECharts from 'echarts-for-react';
import { mean } from '@/lib/utils';
import { useIsMobile } from '@/lib/use-is-mobile';
import {
  baseOption,
  categoryAxis,
  valueAxis,
  barGradient,
  GROUP_COLORS,
  CHART_COLORS,
} from '@/lib/chart-theme';

export default function ThreeGroupChart({
  same,
  higher,
  lower,
  paths,
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

  const sameSalary = mean(
    paths.filter((p) => p.school_tier === paths[0]?.school_tier).map((p) => p.five_year_salary ?? 0),
  );
  const higherSalary = mean(
    paths
      .filter((p) => (p.school_tier ?? 5) < (paths[0]?.school_tier ?? 5))
      .map((p) => p.five_year_salary ?? 0),
  );
  const lowerSalary = mean(
    paths
      .filter((p) => (p.school_tier ?? 5) > (paths[0]?.school_tier ?? 5))
      .map((p) => p.five_year_salary ?? 0),
  );

  const counts = [higher, same, lower];
  const salaries = [
    Math.round(higherSalary / 10000),
    Math.round(sameSalary / 10000),
    Math.round(lowerSalary / 10000),
  ];

  const option = {
    ...baseOption(),
    grid: { top: 64, left: 12, right: 24, bottom: 24, containLabel: true },
    legend: {
      ...baseOption().legend,
      data: ['人数', '5 年平均年薪(万)'],
    },
    xAxis: {
      ...categoryAxis(),
      data: ['更高背景', '同背景', '更低背景'],
    },
    yAxis: [
      valueAxis({ name: '人数', position: 'left' }),
      valueAxis({ name: '万元', position: 'right' }),
    ],
    series: [
      {
        name: '人数',
        type: 'bar',
        barWidth: '38%',
        barCategoryGap: '32%',
        data: counts.map((v, i) => ({
          value: v,
          itemStyle: {
            color: barGradient(
              [GROUP_COLORS.higher, GROUP_COLORS.same, GROUP_COLORS.lower][i],
              [GROUP_COLORS.higherSoft, GROUP_COLORS.sameSoft, GROUP_COLORS.lowerSoft][i],
            ),
            borderRadius: [8, 8, 0, 0],
          },
        })),
        label: {
          show: true,
          position: 'top',
          color: CHART_COLORS.text,
          fontWeight: 'bold',
          fontSize: 12,
          formatter: '{c} 人',
        },
        z: 2,
      },
      {
        name: '5 年平均年薪(万)',
        type: 'line',
        yAxisIndex: 1,
        smooth: 0.4,
        symbol: 'circle',
        symbolSize: 10,
        lineStyle: { width: 2.5, color: CHART_COLORS.amber },
        itemStyle: {
          color: CHART_COLORS.amber,
          borderColor: '#fff',
          borderWidth: 2,
        },
        emphasis: { scale: 1.4 },
        data: salaries,
        label: {
          show: true,
          position: 'top',
          color: CHART_COLORS.amber,
          fontWeight: 'bold',
          fontSize: 12,
          formatter: '{c} 万',
          distance: 10,
        },
        z: 3,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: isMobile ? 280 : 320 }} />;
}
