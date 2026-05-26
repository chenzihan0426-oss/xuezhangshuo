/**
 * #3 5 年时间轴对比图
 *
 * x = 入职后第几年(0-5),y = 平均年薪(万)+ 平均职级(右轴)
 * 三组对照:同背景 / 高背景 / 低背景
 */
'use client';
import ReactECharts from 'echarts-for-react';
import { LEVEL_ORDER } from '@/lib/constants';
import { mean } from '@/lib/utils';
import { useIsMobile } from '@/lib/use-is-mobile';
import type { SeniorPath } from '@/lib/types';
import {
  GROUP_COLORS,
  baseOption,
  categoryAxis,
  valueAxis,
  linearGradient,
  FONT_FAMILY,
  CHART_COLORS,
} from '@/lib/chart-theme';

const YEARS = [0, 1, 2, 3, 4, 5];

function aggregate(paths: SeniorPath[], yearIdx: number, scale = 1) {
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
  const isMobile = useIsMobile();

  const buildSalary = (
    paths: SeniorPath[],
    name: string,
    color: string,
    softStrong: string,
    isMain: boolean,
  ) => {
    const data = YEARS.map((y) => aggregate(paths, y, salaryScale).avgSalary);
    // 仅主线两端显示值标签,避免拥挤
    const endIdx = data.length - 1;
    return {
      name: `${name}·年薪(万)`,
      type: 'line',
      smooth: 0.4,
      symbol: 'circle',
      symbolSize: isMain ? 10 : 7,
      showSymbol: true,
      lineStyle: {
        width: isMain ? 3.5 : 2,
        shadowColor: isMain ? color : 'transparent',
        shadowBlur: isMain ? 8 : 0,
        shadowOffsetY: isMain ? 4 : 0,
        ...(isMain
          ? {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 1, y2: 0,
                colorStops: [
                  { offset: 0, color: '#3b82f6' },
                  { offset: 1, color: '#6366f1' },
                ],
              },
            }
          : { color }),
      },
      itemStyle: {
        color,
        borderColor: '#fff',
        borderWidth: isMain ? 3 : 2,
      },
      emphasis: {
        scale: 1.4,
        itemStyle: { shadowColor: color, shadowBlur: 14 },
      },
      ...(isMain
        ? {
            areaStyle: linearGradient(softStrong, 'rgba(255,255,255,0)'),
          }
        : {}),
      data: data.map((v, i) =>
        isMain && (i === 0 || i === endIdx) && v != null
          ? {
              value: v,
              label: {
                show: true,
                position: i === 0 ? 'top' : 'top',
                color,
                fontWeight: 'bold',
                fontSize: 13,
                fontFamily: FONT_FAMILY,
                formatter: `{c} 万`,
                distance: 12,
                backgroundColor: 'rgba(255,255,255,0.95)',
                padding: [4, 8],
                borderRadius: 6,
                borderColor: 'rgba(226, 232, 240, 0.8)',
                borderWidth: 1,
              },
            }
          : v,
      ),
      yAxisIndex: 0,
      z: isMain ? 4 : 2,
    };
  };

  const buildLevel = (paths: SeniorPath[], name: string, color: string) => {
    const data = YEARS.map((y) => aggregate(paths, y, salaryScale).avgLevel);
    return {
      name: `${name}·平均职级`,
      type: 'line',
      smooth: 0.4,
      symbol: 'rect',
      symbolSize: 5,
      showSymbol: true,
      lineStyle: { color, width: 1, type: 'dashed', opacity: 0.45 },
      itemStyle: { color, opacity: 0.5 },
      data,
      yAxisIndex: 1,
      z: 1,
    };
  };

  const series: any[] = [];
  if (same.length) {
    series.push(buildSalary(same, '同背景', GROUP_COLORS.same, GROUP_COLORS.sameSoftStrong, true));
  }
  if (higher.length) {
    series.push(
      buildSalary(higher, '高背景', GROUP_COLORS.higher, GROUP_COLORS.higherSoftStrong, false),
    );
  }
  if (lower.length) {
    series.push(
      buildSalary(lower, '低背景', GROUP_COLORS.lower, GROUP_COLORS.lowerSoftStrong, false),
    );
  }
  if (same.length) series.push(buildLevel(same, '同背景', GROUP_COLORS.same));
  if (higher.length) series.push(buildLevel(higher, '高背景', GROUP_COLORS.higher));
  if (lower.length) series.push(buildLevel(lower, '低背景', GROUP_COLORS.lower));

  const option = {
    ...baseOption(),
    grid: { top: 60, left: 12, right: 32, bottom: 24, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        lineStyle: { color: CHART_COLORS.grid, type: 'dashed', width: 1 },
      },
      backgroundColor: '#ffffff',
      borderColor: 'transparent',
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: CHART_COLORS.text, fontSize: 12, fontFamily: FONT_FAMILY },
      extraCssText:
        'box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.15), 0 4px 12px -4px rgba(15, 23, 42, 0.08); border-radius: 12px; border: 1px solid rgba(226, 232, 240, 0.8);',
    },
    legend: {
      ...baseOption().legend,
      // 让"年薪"在前、"平均职级"在后聚合(echarts 会按 series 出现顺序排)
      itemGap: 14,
    },
    xAxis: {
      ...categoryAxis(),
      data: YEARS.map((y) => (y === 0 ? '入职' : `第 ${y} 年`)),
      boundaryGap: false,
    },
    yAxis: [
      valueAxis({ name: '年薪(万)', position: 'left' }),
      valueAxis({
        name: '平均职级',
        position: 'right',
        min: 1,
        max: 5,
        axisLabelFormatter: (val: number) => {
          const map: Record<number, string> = { 1: 'graduate', 2: 'junior', 3: 'mid', 4: 'senior', 5: 'lead' };
          return map[Math.round(val)] ?? '';
        },
      }),
    ],
    series,
  };

  return <ReactECharts option={option} style={{ height: isMobile ? 280 : 360 }} />;
}
