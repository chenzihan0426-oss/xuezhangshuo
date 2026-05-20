/**
 * #3 5 年时间轴对比图
 *
 * x = 入职后第几年(0-5),y = 平均年薪(万)+ 平均职级(右轴)
 * 三条线:同背景 / 高背景 / 低背景(基于 paths 的 school_tier 拆分)
 */
'use client';
import ReactECharts from 'echarts-for-react';
import { LEVEL_ORDER } from '@/lib/constants';
import { mean } from '@/lib/utils';
import type { SeniorPath } from '@/lib/types';

const YEARS = [0, 1, 2, 3, 4, 5];

function aggregate(paths: SeniorPath[], yearIdx: number, scale = 1) {
  // 优先用 path_history,如果没有,fallback 到 start_year / 5y endpoints
  const salaries: number[] = [];
  const levels: number[] = [];
  for (const p of paths) {
    if (Array.isArray(p.path_history) && p.path_history.length > yearIdx) {
      const entry = p.path_history[yearIdx];
      if (entry.salary) salaries.push(entry.salary * scale);
      levels.push(LEVEL_ORDER[entry.level] ?? 1);
    } else if (yearIdx === 5 && p.five_year_salary) {
      salaries.push(p.five_year_salary * scale);
      levels.push(LEVEL_ORDER[p.five_year_level ?? 'mid'] ?? 3);
    } else if (yearIdx === 0) {
      levels.push(LEVEL_ORDER[p.first_level] ?? 1);
    }
  }
  return {
    avgSalary: salaries.length ? Math.round(mean(salaries) / 10_000) : null,
    avgLevel: levels.length ? Number(mean(levels).toFixed(2)) : null,
  };
}

export default function TimelineChart({
  same,
  higher,
  lower,
  salaryScale = 1,
}: {
  same: SeniorPath[];
  higher: SeniorPath[];
  lower: SeniorPath[];
  salaryScale?: number;
}) {
  const buildSeries = (paths: SeniorPath[], color: string, name: string) => {
    const salaries = YEARS.map((y) => aggregate(paths, y, salaryScale).avgSalary);
    const levels = YEARS.map((y) => aggregate(paths, y, salaryScale).avgLevel);
    return [
      {
        name: `${name} · 年薪(万)`,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color, width: 2 },
        itemStyle: { color },
        data: salaries,
        yAxisIndex: 0,
      },
      {
        name: `${name} · 平均职级`,
        type: 'line',
        smooth: true,
        symbol: 'rect',
        symbolSize: 5,
        lineStyle: { color, width: 1, type: 'dashed' },
        itemStyle: { color },
        data: levels,
        yAxisIndex: 1,
      },
    ];
  };

  const series = [
    ...buildSeries(same, '#2563eb', '同背景'),
    ...(higher.length ? buildSeries(higher, '#16a34a', '高背景') : []),
    ...(lower.length ? buildSeries(lower, '#94a3b8', '低背景') : []),
  ];

  const option = {
    tooltip: { trigger: 'axis' },
    legend: { top: 0, type: 'scroll' },
    grid: { left: 50, right: 60, top: 50, bottom: 30 },
    xAxis: {
      type: 'category',
      data: YEARS.map((y) => (y === 0 ? '入职' : `第 ${y} 年`)),
    },
    yAxis: [
      { type: 'value', name: '年薪(万)', position: 'left' },
      {
        type: 'value',
        name: '平均职级',
        position: 'right',
        min: 1,
        max: 5,
        axisLabel: {
          formatter: (val: number) => {
            const map: Record<number, string> = { 1: 'graduate', 2: 'junior', 3: 'mid', 4: 'senior', 5: 'lead' };
            return map[Math.round(val)] ?? '';
          },
        },
      },
    ],
    series,
  };

  return <ReactECharts option={option} style={{ height: 320 }} />;
}
