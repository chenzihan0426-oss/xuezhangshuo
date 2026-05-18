'use client';
import ReactECharts from 'echarts-for-react';

export default function SankeyFlow({ paths }: { paths: any[] }) {
  if (!paths.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        当前筛选下没有数据
      </div>
    );
  }
  // 节点:第一段行业 → 5 年后行业
  const links = new Map<string, number>();
  const nodeSet = new Set<string>();
  for (const p of paths) {
    const from = `start:${p.first_industry ?? 'unknown'}`;
    const to = `now:${p.five_year_industry ?? p.first_industry ?? 'unknown'}`;
    nodeSet.add(from);
    nodeSet.add(to);
    const key = `${from}>>${to}`;
    links.set(key, (links.get(key) ?? 0) + 1);
  }
  const nodes = [...nodeSet].map((name) => ({
    name,
    itemStyle: { color: name.startsWith('start:') ? '#94a3b8' : '#2563eb' },
  }));
  const linkData = [...links.entries()].map(([k, v]) => {
    const [source, target] = k.split('>>');
    return { source, target, value: v };
  });

  const option = {
    tooltip: { trigger: 'item', triggerOn: 'mousemove' },
    series: [
      {
        type: 'sankey',
        data: nodes,
        links: linkData,
        emphasis: { focus: 'adjacency' },
        lineStyle: { color: 'gradient', curveness: 0.5 },
        label: { fontSize: 11 },
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 400 }} />;
}
