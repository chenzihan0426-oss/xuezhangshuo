/**
 * M1 首页 / landing(暗色专业招聘风)
 * 服务端组件:已登录且有反推记录 → 显示真实预览;否则显示 sample。
 */
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getServerUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  Users,
  FileText,
  LineChart,
  TrendingUp,
  ChevronRight,
  Database,
  Network,
  AlertCircle,
} from 'lucide-react';
import HomeInlineForm from './home-inline-form';

interface HeroData {
  isSample: boolean;
  same: number;
  higher: number;
  lower: number;
  matchId?: string;
  companyName?: string;
  positionName?: string;
}

async function loadHero(): Promise<HeroData> {
  const sample: HeroData = {
    isSample: true,
    same: 412,
    higher: 138,
    lower: 227,
    companyName: '腾讯',
    positionName: '产品经理',
  };
  try {
    const user = await getServerUser();
    if (!user) return sample;
    const sb = createSupabaseServerClient();
    const { data } = await sb
      .from('matches')
      .select('id, same_count, higher_count, lower_count, user_offers(company_name, position_category)')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return sample;
    const offer = (data as any).user_offers;
    return {
      isSample: false,
      same: data.same_count ?? 0,
      higher: data.higher_count ?? 0,
      lower: data.lower_count ?? 0,
      matchId: data.id,
      companyName: offer?.company_name,
      positionName: offer?.position_category,
    };
  } catch {
    return sample;
  }
}

export default async function Home() {
  const hero = await loadHero();
  const totalSample = hero.same + hero.higher + hero.lower;
  const reportHref = hero.matchId ? `/result/${hero.matchId}` : '/input';

  return (
    <div className="-my-6">
      {/* ================== 暗色 Hero(尾部留充足空间给示例卡桥接) ================== */}
      <section className="relative overflow-hidden bg-slate-900 pt-24 pb-48 md:pt-28 md:pb-56">
        {/* 背景纹理 + 双侧光晕 */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]"></div>
        <div className="pointer-events-none absolute left-1/2 top-[-100px] h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-brand-500/15 blur-[120px]"></div>
        <div className="pointer-events-none absolute right-0 top-[20%] h-[300px] w-[300px] rounded-full bg-indigo-500/10 blur-[100px]"></div>

        {/* 底部柔化光晕(让暗-浅边界不再是硬直线) */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent via-slate-900/30 to-slate-100/40"></div>

        <div className="relative mx-auto max-w-7xl px-6">
          {/* 大标题(单行,渐变高亮"预见五年轨迹") */}
          <div className="mx-auto max-w-5xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl lg:text-[68px] lg:leading-[1.05]">
              看透 Offer 真实价值,
              <span className="bg-gradient-to-r from-sky-300 via-brand-400 to-indigo-300 bg-clip-text text-transparent">
                预见五年轨迹
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-slate-400 md:mt-6 md:text-lg">
              基于 <strong className="text-slate-200">1000+ 真实学长姐脱敏履历</strong>,结合当前行业景气度模型,
              为您提供专业、客观的职业路径对标报告。
            </p>
          </div>

          {/* 内联表单(白底大卡突出) */}
          <div className="mx-auto mt-10 max-w-3xl md:mt-12">
            <HomeInlineForm />
          </div>

          {/* 信任标识 */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" /> 真实履历背调
            </span>
            <span className="flex items-center gap-1.5">
              <LineChart size={14} className="text-brand-400" /> 算法环境校正
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-indigo-400" /> K≥1000 隐私脱敏
            </span>
          </div>
        </div>
      </section>

      {/* ================== 示例报告卡(大负 margin 真正桥接暗-浅) ================== */}
      <section className="relative bg-slate-50 pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="-mt-40 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5 md:-mt-48">
            {/* 卡头 */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <FileText size={16} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {hero.isSample ? '示例对标报告:' : '最近一次反推:'}
                    {hero.companyName ?? '腾讯'} · {hero.positionName ?? '产品经理'}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    报告生成时间: {new Date().toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  已过滤无效样本
                </Badge>
                <Link
                  href={reportHref}
                  className="group flex items-center text-sm font-medium text-brand-600 transition hover:text-brand-700"
                >
                  查看完整报告 <ChevronRight className="ml-0.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>

            {/* 卡身 */}
            <div className="bg-slate-50/30 px-6 py-7">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">样本人群分布 (5 年发展追踪)</h3>
                <span className="text-xs text-slate-500">基于 {totalSample} 份真实履历</span>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <SampleStat
                  label="同背景竞争者"
                  value={hero.same}
                  tag={{ icon: <TrendingUp size={12} />, text: '核心对标人群', tone: 'brand' }}
                />
                <SampleStat
                  label="更优背景人群"
                  value={hero.higher}
                  tag={{ icon: <LineChart size={12} />, text: '该 Offer 的天花板指标', tone: 'emerald' }}
                  highlight
                />
                <SampleStat
                  label="偏弱背景人群"
                  value={hero.lower}
                  tag={{ icon: <AlertCircle size={12} />, text: '该 Offer 的安全底线', tone: 'slate' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================== 为什么准 / 三栏特性 ================== */}
      <section className="border-y border-slate-200 bg-white py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 grid gap-8 md:grid-cols-2 md:items-end">
            <div>
              <Badge variant="secondary" className="mb-3 text-xs">为什么准</Badge>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                不止"看数据",更"扣红利"
              </h2>
            </div>
            <p className="text-base text-slate-600 md:text-lg">
              三大算法维度立体对照,把上一代人不可复制的时代红利从分数里扣掉。
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              title="同/高/低 立体对照"
              tone="brand"
              desc="不只看跟你一样的人,也看比你强的、比你弱的。明确告诉你这个 Offer 的天花板和底线。"
            />
            <FeatureCard
              icon={<TrendingDown className="h-5 w-5" />}
              title="环境校正(决赛胜负手)"
              tone="amber"
              tag="核心科技 ⭐"
              desc="行业景气 × AI 替代风险 × 政策事件。把上一代人吃到的时代红利从分数里无情扣掉,只给你看干货。"
            />
            <FeatureCard
              icon={<LineChart className="h-5 w-5" />}
              title="单条路径可看可筛"
              tone="indigo"
              desc="412 条真实师兄路径,每一条都能展开看 5 年时间轴。支持按跳槽、转行、薪资精准筛选。"
            />
          </div>
        </div>
      </section>

      {/* ================== 数据飞轮 + 收尾 CTA(同色,不再切回暗) ================== */}
      <section className="bg-slate-50 py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 grid gap-8 md:grid-cols-2 md:items-end">
            <div>
              <Badge variant="secondary" className="mb-3 text-xs">数据飞轮</Badge>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                透明的数据来源,且会越来越准
              </h2>
            </div>
            <p className="text-base text-slate-600 md:text-lg">
              从公开基线 → 用户众包 → 机构合作。每一个校正因子都标注来源,可在结果页逐项核对。
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <DataStep
              step="01"
              badge="V1 现在"
              badgeColor="border-brand-200 bg-brand-50 text-brand-700"
              icon={<Database className="h-5 w-5 text-brand-600" />}
              title="公开数据基线"
              desc="基于智联《高校毕业生就业报告》、麦可思《就业蓝皮书》、国家统计局公开数据构建师兄路径与环境校正基线。每个校正因子都标注来源、可在结果页逐项核对。"
            />
            <DataStep
              step="02"
              badge="V2 众包"
              badgeColor="border-amber-200 bg-amber-50 text-amber-700"
              icon={<Users className="h-5 w-5 text-amber-600" />}
              title="用户上传真实路径"
              desc="用户自愿回填 5 年轨迹沉淀为平台私有数据集。用得越多、反推越准,形成别人难以复制的网络效应。"
            />
            <DataStep
              step="03"
              badge="V3 合作"
              badgeColor="border-emerald-200 bg-emerald-50 text-emerald-700"
              icon={<Network className="h-5 w-5 text-emerald-600" />}
              title="机构脱敏数据"
              desc={'与智联、高校就业指导中心对接脱敏真实样本(协商中),全程 k-匿名 ≥1000、不落个人信息,把基线从"演示"升级为绝对"可核验"。'}
            />
          </div>

          {/* 收尾 CTA(浅色卡,不再切暗) */}
          <div className="mt-16 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm md:p-14">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              2 分钟,看清这个 Offer 5 年后的样子
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-slate-600 md:text-lg">
              填完背景与 Offer,系统自动匹配 1000+ 真实样本生成对标报告。
            </p>
            <Button asChild size="xl" className="mt-8 h-14 rounded-full bg-brand-600 px-10 shadow-lg shadow-brand-500/20 hover:bg-brand-700">
              <Link href="/input">
                立即免费评估 <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="mt-6 text-xs text-slate-500">
              ⚠️ 当前展示为 <strong className="text-slate-700">V1 演示数据</strong>:用于验证算法与交互,师兄路径为按公开分布生成的模拟样本,不代表特定真实个人。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function SampleStat({
  label,
  value,
  tag,
  highlight = false,
}: {
  label: string;
  value: number;
  tag: { icon: React.ReactNode; text: string; tone: 'brand' | 'emerald' | 'slate' };
  highlight?: boolean;
}) {
  const toneClass = {
    brand: 'text-brand-600',
    emerald: 'text-emerald-600',
    slate: 'text-slate-500',
  }[tag.tone];
  return (
    <div
      className={`rounded-xl border p-5 transition ${
        highlight ? 'border-brand-200 bg-brand-50/40' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-4xl font-black tracking-tighter text-slate-900 md:text-5xl">{value}</span>
        <span className="text-sm text-slate-400">人</span>
      </div>
      <div className={`mt-3 flex items-center gap-1.5 text-xs ${toneClass}`}>
        {tag.icon}
        <span>{tag.text}</span>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  tone,
  tag,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  tone: 'brand' | 'amber' | 'indigo';
  tag?: string;
}) {
  const styles = {
    brand: { bg: 'bg-brand-50 text-brand-600', border: 'hover:border-brand-200' },
    amber: { bg: 'bg-amber-50 text-amber-600', border: 'hover:border-amber-200' },
    indigo: { bg: 'bg-indigo-50 text-indigo-600', border: 'hover:border-indigo-200' },
  }[tone];

  return (
    <div className={`group relative rounded-2xl border border-slate-200 bg-white p-7 transition-all hover:-translate-y-1 hover:shadow-xl ${styles.border}`}>
      {tag && (
        <div className="absolute right-4 top-4">
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{tag}</Badge>
        </div>
      )}
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${styles.bg}`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold tracking-tight text-slate-900">{title}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{desc}</p>
    </div>
  );
}

function DataStep({
  step,
  badge,
  badgeColor,
  icon,
  title,
  desc,
}: {
  step: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-7 transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-md">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50">
          {icon}
        </div>
        <span className="text-3xl font-black text-slate-200 transition-colors group-hover:text-brand-200">{step}</span>
      </div>
      <div className="mb-2 flex items-center gap-2">
        <Badge className={`border shadow-sm ${badgeColor}`}>{badge}</Badge>
        <span className="font-semibold text-slate-900">{title}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{desc}</p>
    </div>
  );
}
