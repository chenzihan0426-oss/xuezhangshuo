'use client';
import ReactECharts from 'echarts-for-react';
import { useIsMobile } from '@/lib/use-is-mobile';
import { CHART_COLORS, FONT_FAMILY } from '@/lib/chart-theme';
import { INDUSTRY_LABEL } from '@/lib/constants';

// 节点配色:5 种柔和色循环,起点和终点用不同色系区分
const START_PALETTE = ['#94a3b8', '#a5b4fc', '#c7d2fe', '#e0e7ff', '#cbd5e1'];
const END_PALETTE = ['#2563eb', '#3b82f6', '#60a5fa', '#0ea5e9', '#06b6d4'];

const cn = (key: string) => INDUSTRY_LABEL[key] ?? key;

export default function SankeyFlow({ paths }: { paths: any[] }) {
  const isMobile = useIsMobile();
  if (!paths.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        当前筛选下没有数据
      </div>
    );
  }

  const links = new Map<string, number>();
  const startNodes = new Set<string>();
  const endNodes = new Set<string>();
  const startCounts = new Map<string, number>();
  const endCounts = new Map<string, number>();
  let stayCount = 0;
  let switchCount = 0;

  for (const p of paths) {
    const fromKey = p.first_industry ?? 'unknown';
    const toKey = p.five_year_industry ?? fromKey;
    const from = `start:${fromKey}`;
    const to = `now:${toKey}`;
    startNodes.add(from);
    endNodes.add(to);
    startCounts.set(from, (startCounts.get(from) ?? 0) + 1);
    endCounts.set(to, (endCounts.get(to) ?? 0) + 1);
    const key = `${from}>>${to}`;
    links.set(key, (links.get(key) ?? 0) + 1);
    if (fromKey === toKey) stayCount++;
    else switchCount++;
  }

  const total = paths.length;
  const stayRate = total > 0 ? Math.round((stayCount / total) * 100) : 0;

  const startArr = [...startNodes];
  const endArr = [...endNodes];
  const nodes = [
    ...startArr.map((name, i) => {
      const count = startCounts.get(name) ?? 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        name,
        itemStyle: { color: START_PALETTE[i % START_PALETTE.length], borderColor: 'transparent' },
        label: {
          color: CHART_COLORS.text,
          fontFamily: FONT_FAMILY,
          fontSize: isMobile ? 11 : 13,
          fontWeight: 600,
          formatter: () => `${cn(name.replace(/^start:/, ''))}  ${pct}%`,
        },
      };
    }),
    ...endArr.map((name, i) => {
      const count = endCounts.get(name) ?? 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        name,
        itemStyle: { color: END_PALETTE[i % END_PALETTE.length], borderColor: 'transparent' },
        label: {
          color: CHART_COLORS.text,
          fontFamily: FONT_FAMILY,
          fontSize: isMobile ? 11 : 13,
          fontWeight: 600,
          formatter: () => `${cn(name.replace(/^now:/, ''))}  ${pct}%`,
        },
      };
    }),
  ];

  const linkData = [...links.entries()].map(([k, v]) => {
    const [source, target] = k.split('>>');
    return { source, target, value: v };
  });

  const option = {
    textStyle: { fontFamily: FONT_FAMILY, color: CHART_COLORS.text },
    // 顶部列头说明 + 留存率徽章
    graphic: [
      {
        type: 'group',
        left: 32,
        top: 16,
        children: [
          {
            type: 'rect',
            shape: { width: 6, height: 14, r: 2 },
            style: { fill: CHART_COLORS.slate },
            left: 0,
            top: 2,
          },
          {
            type: 'text',
            left: 12,
            top: 0,
            style: {
              text: '入职行业',
              fontSize: 12,
              fontWeight: 600,
              fill: CHART_COLORS.textMuted,
              fontFamily: FONT_FAMILY,
            },
          },
        ],
      },
      {
        type: 'group',
        right: 100,
        top: 16,
        children: [
          {
            type: 'rect',
            shape: { width: 6, height: 14, r: 2 },
            style: { fill: CHART_COLORS.brand },
            left: 0,
            top: 2,
          },
          {
            type: 'text',
            left: 12,
            top: 0,
            style: {
              text: '5 年后行业',
              fontSize: 12,
              fontWeight: 600,
              fill: CHART_COLORS.textMuted,
              fontFamily: FONT_FAMILY,
            },
          },
        ],
      },
      // 中央留存率徽章
      {
        type: 'group',
        left: 'center',
        top: 12,
        children: [
          {
            type: 'rect',
            shape: { width: 116, height: 26, r: 13 },
            style: {
              fill: stayRate >= 70 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.12)',
              stroke: stayRate >= 70 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)',
              lineWidth: 1,
            },
            left: 0,
            top: 0,
          },
          {
            type: 'text',
            left: 12,
            top: 6,
            style: {
              text: `🔁 行业留存率 ${stayRate}%`,
              fontSize: 12,
              fontWeight: 600,
              fill: stayRate >= 70 ? '#047857' : '#b45309',
              fontFamily: FONT_FAMILY,
            },
          },
        ],
      },
    ],
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      backgroundColor: '#ffffff',
      borderColor: 'transparent',
      borderWidth: 0,
      padding: [10, 14],
      textStyle: { color: CHART_COLORS.text, fontSize: 12, fontFamily: FONT_FAMILY },
      extraCssText:
        'box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.15), 0 4px 12px -4px rgba(15, 23, 42, 0.08); border-radius: 12px; border: 1px solid rgba(226, 232, 240, 0.8);',
      formatter: (params: any) => {
        if (params.dataType === 'edge') {
          const src = cn(String(params.data.source).replace(/^start:/, ''));
          const dst = cn(String(params.data.target).replace(/^now:/, ''));
          const stayed = String(params.data.source).replace(/^start:/, '') === String(params.data.target).replace(/^now:/, '');
          return `<div style="font-weight:600">${src} → ${dst}</div><div style="color:${CHART_COLORS.textMuted};margin-top:4px">${params.data.value} 位师兄 · ${stayed ? '留在原行业' : '跨行业迁移'}</div>`;
        }
        const raw = String(params.name).replace(/^start:|^now:/, '');
        const name = cn(raw);
        const phase = String(params.name).startsWith('start:') ? '入职行业' : '5 年后行业';
        return `<div style="font-weight:600">${name}</div><div style="color:${CHART_COLORS.textMuted};margin-top:4px">${phase}</div>`;
      },
    },
    series: [
      {
        type: 'sankey',
        left: 32,
        right: 140,
        top: 64,
        bottom: 32,
        data: nodes,
        links: linkData,
        nodeWidth: 14,
        nodeGap: 16,
        nodeAlign: 'justify',
        emphasis: {
          focus: 'adjacency',
          itemStyle: { shadowColor: 'rgba(15, 23, 42, 0.2)', shadowBlur: 14 },
        },
        lineStyle: {
          color: 'gradient',
          curveness: 0.55,
          opacity: 0.45,
        },
        itemStyle: {
          borderRadius: 4,
        },
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: isMobile ? 320 : 440 }} />;
}
