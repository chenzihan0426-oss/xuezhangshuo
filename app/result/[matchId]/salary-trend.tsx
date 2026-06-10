'use client';
import ReactECharts from 'echarts-for-react';
import { quantile } from '@/lib/utils';
import { useIsMobile } from '@/lib/use-is-mobile';
import {
  baseOption,
  categoryAxis,
  valueAxis,
  barGradient,
  CHART_COLORS,
  GROUP_COLORS,
  FONT_FAMILY,
} from '@/lib/chart-theme';

export default function SalaryTrend({ paths, salaryScale = 1 }: { paths: any[]; salaryScale?: number }) {
  const isMobile = useIsMobile();
  if (!paths.length) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        当前筛选下没有数据
      </div>
    );
  }

  // 把薪资分桶(以 10 万为单位)。salaryScale 把 mock 量级对齐到 AI 市场水平。
  const buckets = new Map<number, number>();
  const salaries: number[] = [];
  for (const p of paths) {
    const s = (p.five_year_salary ?? 0) * salaryScale;
    if (s <= 0) continue; // 缺薪资的样本不进分布,否则"0-10 万"会出一根假柱
    salaries.push(s);
    const b = Math.floor(s / 100000) * 10;
    buckets.set(b, (buckets.get(b) ?? 0) + 1);
  }
  const sorted = [...buckets.entries()].sort((a, b) => a[0] - b[0]);

  const hasEnough = salaries.length >= 5;
  const p10 = hasEnough ? quantile(salaries, 0.1) : 0;
  const p50 = hasEnough ? quantile(salaries, 0.5) : 0;
  const p90 = hasEnough ? quantile(salaries, 0.9) : 0;

  const findBucketIdx = (salary: number): number => {
    const b = Math.floor(salary / 100000) * 10;
    const exact = sorted.findIndex(([k]) => k === b);
    if (exact >= 0) return exact;
    // 分位数插值可能落进空桶(无样本),取 key 最接近的那根柱
    let nearest = -1;
    let bestDist = Infinity;
    sorted.forEach(([k], i) => {
      const d = Math.abs(k - b);
      if (d < bestDist) {
        bestDist = d;
        nearest = i;
      }
    });
    return nearest;
  };

  // 给中位数那一根柱子额外加亮(emerald 强调)
  const medianIdx = hasEnough ? findBucketIdx(p50) : -1;

  const option = {
    ...baseOption(),
    grid: { top: 56, left: 12, right: 24, bottom: 36, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        shadowStyle: { color: CHART_COLORS.brandSoft },
      },
      backgroundColor: '#ffffff',
      borderColor: 'transparent',
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: CHART_COLORS.text, fontSize: 12, fontFamily: FONT_FAMILY },
      extraCssText:
        'box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.15), 0 4px 12px -4px rgba(15, 23, 42, 0.08); border-radius: 12px; border: 1px solid rgba(226, 232, 240, 0.8);',
    },
    legend: { show: false },
    xAxis: {
      ...categoryAxis(),
      data: sorted.map(([k]) => `${k}-${k + 10} 万`),
      axisLabel: {
        color: CHART_COLORS.textMuted,
        fontSize: 11,
        fontFamily: FONT_FAMILY,
        rotate: 30,
        margin: 12,
      },
    },
    yAxis: valueAxis({ name: '人数' }),
    series: [
      {
        type: 'bar',
        data: sorted.map(([, v], idx) => ({
          value: v,
          itemStyle: {
            color:
              idx === medianIdx
                ? barGradient(GROUP_COLORS.higher, GROUP_COLORS.higherSoft)
                : barGradient(GROUP_COLORS.same, GROUP_COLORS.sameSoft),
            borderRadius: [8, 8, 0, 0],
          },
        })),
        barWidth: '52%',
        markLine: hasEnough
          ? {
              symbol: 'none',
              label: {
                formatter: (p: { name: string }) => p.name,
                fontSize: 10,
                color: CHART_COLORS.textMuted,
                fontFamily: FONT_FAMILY,
                padding: [4, 8],
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: 4,
              },
              lineStyle: { type: 'dashed', width: 1.5 },
              data: [
                {
                  name: `P10 ${(p10 / 10000).toFixed(0)} 万`,
                  xAxis: findBucketIdx(p10),
                  lineStyle: { color: CHART_COLORS.slate, opacity: 0.6 },
                },
                {
                  name: `中位 ${(p50 / 10000).toFixed(0)} 万`,
                  xAxis: findBucketIdx(p50),
                  lineStyle: { color: CHART_COLORS.emerald, width: 2 },
                  label: { color: CHART_COLORS.emerald, fontWeight: 'bold' },
                },
                {
                  name: `P90 ${(p90 / 10000).toFixed(0)} 万`,
                  xAxis: findBucketIdx(p90),
                  lineStyle: { color: CHART_COLORS.slate, opacity: 0.6 },
                },
              ],
            }
          : undefined,
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: isMobile ? 260 : 300 }} />;
}
