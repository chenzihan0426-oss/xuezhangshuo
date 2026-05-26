/**
 * 统一 ECharts 设计 token —— 跟 SaaS 暗色仪表盘的视觉语言保持一致
 *
 * 用法:
 *   const option = { ...withChartTheme({ tooltip: {...}, series: [...] }) }
 */
import type { EChartsOption } from 'echarts';

export const CHART_COLORS = {
  // 主色:同背景(brand)— 主参照
  brand: '#2563eb',
  brandSoft: 'rgba(37, 99, 235, 0.12)',
  brandSoftStrong: 'rgba(37, 99, 235, 0.28)',
  // 强调:更高背景 — 期望线
  emerald: '#10b981',
  emeraldSoft: 'rgba(16, 185, 129, 0.12)',
  emeraldSoftStrong: 'rgba(16, 185, 129, 0.28)',
  // 弱化:更低背景 — 底线
  slate: '#94a3b8',
  slateSoft: 'rgba(148, 163, 184, 0.12)',
  slateSoftStrong: 'rgba(148, 163, 184, 0.28)',
  // 警示
  amber: '#f59e0b',
  amberSoft: 'rgba(245, 158, 11, 0.18)',
  // 灰度
  axis: '#cbd5e1',          // 轴标签
  grid: '#e2e8f0',          // 网格线
  text: '#1e293b',          // 主文字
  textMuted: '#64748b',     // 次要文字
} as const;

// 三组对照颜色组(同/高/低)
export const GROUP_COLORS = {
  same: CHART_COLORS.brand,
  sameSoft: CHART_COLORS.brandSoft,
  sameSoftStrong: CHART_COLORS.brandSoftStrong,
  higher: CHART_COLORS.emerald,
  higherSoft: CHART_COLORS.emeraldSoft,
  higherSoftStrong: CHART_COLORS.emeraldSoftStrong,
  lower: CHART_COLORS.slate,
  lowerSoft: CHART_COLORS.slateSoft,
  lowerSoftStrong: CHART_COLORS.slateSoftStrong,
} as const;

/** ECharts 通用 textStyle */
export const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

/**
 * 现代化卡片式 tooltip(白底 + 阴影 + 无边框)
 */
export const TOOLTIP_STYLE: any = {
  backgroundColor: '#ffffff',
  borderColor: 'transparent',
  borderWidth: 0,
  padding: [10, 14],
  textStyle: {
    color: CHART_COLORS.text,
    fontSize: 12,
    fontFamily: FONT_FAMILY,
  },
  extraCssText:
    'box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.15), 0 4px 12px -4px rgba(15, 23, 42, 0.08); border-radius: 12px; border: 1px solid rgba(226, 232, 240, 0.8);',
};

/**
 * 通用图表底座(轴+网格+legend)
 * 调用方只需提供 series 和需要覆盖的部分
 */
export function baseOption(): Partial<EChartsOption> {
  return {
    textStyle: { fontFamily: FONT_FAMILY, color: CHART_COLORS.text },
    grid: {
      top: 48,
      left: 12,
      right: 16,
      bottom: 24,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        lineStyle: { color: CHART_COLORS.grid, type: 'dashed', width: 1 },
      },
      ...TOOLTIP_STYLE,
    },
    legend: {
      top: 8,
      type: 'scroll',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 16,
      textStyle: {
        color: CHART_COLORS.textMuted,
        fontSize: 12,
        fontFamily: FONT_FAMILY,
      },
    },
  };
}

/** 现代化分类轴(x):无 axisLine,标签柔和 */
export function categoryAxis(): any {
  return {
    type: 'category',
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: CHART_COLORS.textMuted,
      fontSize: 11,
      fontFamily: FONT_FAMILY,
      margin: 12,
    },
  };
}

/** 现代化数值轴(y):无 axisLine,虚线网格 */
export function valueAxis(opts: { name?: string; position?: 'left' | 'right'; max?: number; min?: number; axisLabelFormatter?: (val: number) => string } = {}): any {
  return {
    type: 'value',
    name: opts.name,
    position: opts.position,
    max: opts.max,
    min: opts.min,
    nameTextStyle: {
      color: CHART_COLORS.textMuted,
      fontSize: 11,
      fontFamily: FONT_FAMILY,
      padding: [0, 0, 8, 0],
    },
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: {
      lineStyle: { color: CHART_COLORS.grid, type: 'dashed', width: 1 },
    },
    axisLabel: {
      color: CHART_COLORS.textMuted,
      fontSize: 11,
      fontFamily: FONT_FAMILY,
      ...(opts.axisLabelFormatter ? { formatter: opts.axisLabelFormatter } : {}),
    },
  };
}

/**
 * 渐变填充(线下) —— 用于面积图
 * 用法: areaStyle: linearGradient(GROUP_COLORS.sameSoftStrong)
 */
export function linearGradient(colorTop: string, colorBottom = 'rgba(255,255,255,0)'): any {
  return {
    color: {
      type: 'linear',
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: colorTop },
        { offset: 1, color: colorBottom },
      ],
    },
  };
}

/**
 * 柱状渐变(顶亮底暗) —— 用于 bar
 */
export function barGradient(colorTop: string, colorBottom: string): any {
  return {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: colorTop },
      { offset: 1, color: colorBottom },
    ],
  };
}
