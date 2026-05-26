/**
 * M11 分享页(公开,不需要登录,匿名展示一张卡片)
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import {
  BarChart3,
  Building2,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  LineChart,
  TrendingDown,
} from 'lucide-react';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const svc = createSupabaseServiceClient();
  const { data } = await svc
    .from('matches')
    .select('user_offers(*), correction_data')
    .eq('id', params.id)
    .maybeSingle();
  const offer = (data as any)?.user_offers;
  const cd = data?.correction_data ?? {};
  const title = offer
    ? `${offer.company_name ?? '#' + offer.company_id} · 校正后评分 ${cd.corrected_score ?? '-'}`
    : '匿名分享 | 学长说';
  return {
    title,
    description: '有人反推了这个 offer,你也来看看自己的。',
    openGraph: { title, description: '点开看校正后的评分,以及他们 5 年后的真实画像' },
  };
}

export default async function SharePage({ params }: { params: { id: string } }) {
  const svc = createSupabaseServiceClient();
  const { data } = await svc
    .from('matches')
    .select('id, same_count, higher_count, lower_count, correction_data, user_offers(*)')
    .eq('id', params.id)
    .maybeSingle();
  if (!data) notFound();

  const off = (data as any).user_offers;
  const cd = data.correction_data ?? {};
  const delta = (cd.corrected_score ?? 0) - (cd.original_score ?? 0);
  const totalSample = (data.same_count ?? 0) + (data.higher_count ?? 0) + (data.lower_count ?? 0);

  return (
    <div className="min-h-screen -my-6 bg-slate-50 font-sans">
      {/* 顶部品牌带 */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
              <BarChart3 size={14} />
            </div>
            <span className="font-semibold text-slate-900">学长说</span>
            <span className="text-slate-300">|</span>
            <span>人才市场对标摘要</span>
          </div>
          <Button asChild size="sm" className="bg-brand-600 hover:bg-brand-700">
            <Link href="/input">
              反推我的 Offer <ArrowRight className="ml-1.5 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          {/* 左:分享卡片本体 */}
          <div>
            <Badge variant="outline" className="mb-4 border-brand-200 bg-brand-50 text-brand-700">
              <Sparkles className="mr-1.5 h-3 w-3" /> 有人反推了这个 Offer
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              这个 Offer 5 年后,<br />大概率长这样
            </h1>
            <p className="mt-3 max-w-md text-sm text-slate-500 md:text-base">
              基于 {totalSample > 0 ? totalSample + ' 份' : '上千份'} 真实脱敏履历的环境校正评估
            </p>

            <Card className="mt-8 overflow-hidden border-slate-200 shadow-xl">
              <div className="bg-slate-900 px-6 py-6 text-center text-white">
                <Building2 size={24} className="mx-auto mb-2 text-slate-400 opacity-50" />
                <div className="text-2xl font-bold tracking-tight">
                  {off?.company_name ?? '#' + off?.company_id} · {off?.position_category ?? '核心岗位'}
                </div>
                <div className="mt-3 flex justify-center gap-2">
                  <Badge className="border-brand-500/30 bg-brand-500/20 text-[10px] text-brand-300 hover:bg-brand-500/20">
                    对标 {data.same_count} 人
                  </Badge>
                  <Badge className="border-slate-700 bg-slate-800 text-[10px] text-slate-300 hover:bg-slate-800">
                    高维 {data.higher_count} 人
                  </Badge>
                  <Badge className="border-slate-700 bg-slate-800 text-[10px] text-slate-300 hover:bg-slate-800">
                    下限 {data.lower_count} 人
                  </Badge>
                </div>
              </div>

              <CardContent className="bg-white p-6 md:p-8">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 text-center shadow-inner">
                  <div className="flex items-center justify-center gap-1 text-xs font-semibold text-slate-500">
                    <TrendingUp size={14} /> 环境校正后·综合潜力分
                  </div>
                  <div className="mt-2 flex items-baseline justify-center gap-1">
                    <span className="text-6xl font-black text-slate-900">{cd?.corrected_score ?? '-'}</span>
                    <span className="text-sm font-medium text-slate-400">/ 100</span>
                  </div>

                  <div className="mx-auto mt-4 max-w-[320px] rounded border border-slate-200 bg-white p-3 text-left text-xs shadow-sm">
                    <div className="mb-1 flex justify-between font-bold text-slate-700">
                      <span>时代红利算法扣减:</span>
                      <span className={delta < 0 ? 'text-amber-600' : 'text-emerald-600'}>
                        {delta > 0 ? '+' : ''}{delta.toFixed?.(1) ?? 0} 分
                      </span>
                    </div>
                    <p className="line-clamp-3 leading-relaxed text-slate-500">
                      {cd?.explanation || '基于当前宏观行业景气度及岗位供需关系,系统已对原始模型分进行了环境折损校正。'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="mt-4 text-center text-xs text-slate-400">
              🔍 V1 演示数据为模拟数据(基于公开就业报告分布生成),正式版将对接智联真实合作数据
            </p>
          </div>

          {/* 右:产品说明 + CTA 引导 */}
          <div className="space-y-6 lg:pt-20">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                "学长说"是什么?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                用 <strong className="text-slate-900">1000+ 名相似背景师兄师姐</strong> 5 年前的真实选择,
                告诉你这个 Offer 5 年后大概率会变成什么样。
                <br />
                <strong className="text-slate-900">还会扣掉"时代红利"</strong>,还原真实未来。
              </p>

              <div className="mt-6 space-y-3">
                <Feature icon={<LineChart size={16} />} title="同/高/低 立体对照" desc="不止跟你同档,还看天花板和底线" />
                <Feature
                  icon={<TrendingDown size={16} />}
                  title="环境校正(决赛胜负手)"
                  desc="行业景气 × AI 替代风险 × 政策事件,扣掉时代红利"
                  highlight
                />
                <Feature icon={<ShieldCheck size={16} />} title="数据脱敏 k≥1000" desc="不留任何可识别个人信息" />
              </div>
            </div>

            <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-indigo-50 p-6 shadow-sm md:p-8">
              <h3 className="text-lg font-bold tracking-tight text-slate-900">
                想看自己的 Offer 5 年后?
              </h3>
              <p className="mt-2 text-sm text-slate-600">2 分钟填完背景 + Offer,生成专属对标报告。</p>
              <Button asChild size="lg" className="mt-5 w-full bg-brand-600 text-base shadow-md hover:bg-brand-700">
                <Link href="/input">
                  免费生成我的报告 <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <div className="mt-4 flex justify-center gap-x-6 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-emerald-500" /> 不强制注册</span>
                <span className="flex items-center gap-1"><Sparkles size={12} className="text-amber-500" /> 大赛免费版</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
  highlight = false,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${highlight ? 'border-amber-200 bg-amber-50/40' : 'border-slate-100 bg-slate-50/50'}`}>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${highlight ? 'bg-amber-100 text-amber-600' : 'bg-white text-brand-600'}`}>
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-0.5 text-xs text-slate-500">{desc}</div>
      </div>
    </div>
  );
}
