/**
 * M1 首页 / landing
 * 服务端组件:已登录且有反推记录 → 显示真实预览;否则显示 sample。
 */
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getServerUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

interface HeroData {
  isSample: boolean;
  same: number;
  higher: number;
  lower: number;
  industryNow?: number;
  industryThen?: number;
  industry?: string;
  matchId?: string;
}

async function loadHero(): Promise<HeroData> {
  const sample: HeroData = {
    isSample: true,
    same: 412,
    higher: 138,
    lower: 227,
    industryNow: 0.7,
    industryThen: 1.1,
    industry: 'internet',
  };
  try {
    const user = await getServerUser();
    if (!user) return sample;
    const sb = createSupabaseServerClient();
    const { data } = await sb
      .from('matches')
      .select('id, same_count, higher_count, lower_count, correction_data')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return sample;
    const factors = data.correction_data?.factors;
    return {
      isSample: false,
      same: data.same_count ?? 0,
      higher: data.higher_count ?? 0,
      lower: data.lower_count ?? 0,
      industryNow: factors?.industry,
      matchId: data.id,
    };
  } catch {
    return sample;
  }
}

export default async function Home() {
  const hero = await loadHero();
  const HERO_INDUSTRY_LABEL: Record<string, string> = {
    internet: '互联网',
    finance: '金融',
    auto_ev: '新能源车',
  };
  const industryLabel = hero.industry ? (HERO_INDUSTRY_LABEL[hero.industry] ?? hero.industry) : '互联网';

  return (
    <div className="space-y-12 md:space-y-16">
      {/* Hero */}
      <section className="grid gap-8 py-8 md:grid-cols-2 md:items-center md:gap-10 md:py-12">
        <div className="space-y-5 md:space-y-6">
          <Badge variant="secondary" className="text-xs">2026 新人秋招 · 数智时代职业引路人</Badge>
          <h1 className="text-3xl font-bold leading-tight md:text-5xl">
            把那个 offer<br />
            <span className="text-brand-600">"反推 5 年后"</span>
          </h1>
          <p className="text-muted-foreground md:text-lg">
            用 <strong>1000+ 名相似背景师兄师姐</strong> 5 年前的真实选择,<br />
            告诉你这个 offer 5 年后大概率会变成什么样。<br />
            <span className="text-foreground">⭐ 还会扣掉"时代红利",这才是真实的</span>。
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="xl">
              <Link href="/input">免费反推我的 offer →</Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href="/profile">查看历史反推</Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span>✓ 不强制注册</span>
            <span>✓ 数据脱敏 k≥1000</span>
            <span>✓ 大赛免费版</span>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-2xl border bg-gradient-to-br from-brand-50 to-white p-5 shadow-lg md:p-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {hero.isSample ? '示例 · ' : '你最近一次反推 · '}
                同样的选择,5 年后...
              </span>
              {hero.isSample ? (
                <Badge variant="outline" className="text-[10px]">示例</Badge>
              ) : (
                hero.matchId && (
                  <Link
                    href={`/result/${hero.matchId}`}
                    className="text-brand-600 hover:underline"
                  >
                    查看完整 →
                  </Link>
                )
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Stat label="同背景" value={String(hero.same)} sub="人" />
              <Stat label="更高背景" value={String(hero.higher)} sub="人" />
              <Stat label="更低背景" value={String(hero.lower)} sub="人" />
            </div>
            <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              <strong>⚠️ 环境校正提示</strong>
              <p className="mt-1">
                {hero.isSample ? (
                  <>
                    这些师兄起步时,<u>{industryLabel}行业景气度 {hero.industryThen?.toFixed(1)}×</u>。
                    现在(2026)只有 {hero.industryNow?.toFixed(1)}×,你大概率拿不到他们当年的红利。
                  </>
                ) : hero.industryNow !== undefined ? (
                  <>
                    你这次反推的行业,当前景气度为 <u>{(hero.industryNow * 100).toFixed(0)}%</u>。
                    校正分数已扣减相应红利。
                  </>
                ) : (
                  '这次反推涉及多个因子的校正,详情见结果页。'
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 三栏卖点 */}
      <section className="grid gap-6 md:grid-cols-3">
        <Feature title="同/高/低背景对照"
          desc="不只看跟你一样的人,也看比你强的、比你弱的,告诉你这个 offer 的天花板和底线"
        />
        <Feature title="环境校正(决赛胜负手)⭐"
          desc="行业景气 × AI 替代风险 × 政策事件。把上一代人的红利从分数里扣掉"
        />
        <Feature title="单条路径可看可筛"
          desc="412 条真实师兄路径,每一条都能展开看 5 年时间轴,按跳槽 / 转行 / 薪资筛选"
        />
      </section>

      {/* 数据飞轮:从公开基线 → 众包 → 机构合作,讲清楚护城河怎么越滚越深 */}
      <section className="rounded-xl border bg-muted/40 p-6 text-sm">
        <p className="font-semibold text-foreground">🔍 数据从哪来,会越来越准</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-white p-3">
            <div className="flex items-center gap-2">
              <Badge variant="success" className="text-[10px]">V1 现在</Badge>
              <span className="text-xs font-medium">公开数据基线</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              基于智联《高校毕业生就业报告》、麦可思《就业蓝皮书》、国家统计局公开数据构建师兄路径与环境校正基线,
              LLM 辅助补全后人工抽检 —— <strong>每个校正因子都标注来源、可在结果页逐项核对</strong>。
            </p>
          </div>
          <div className="rounded-lg border bg-white p-3">
            <div className="flex items-center gap-2">
              <Badge variant="warning" className="text-[10px]">V2 众包</Badge>
              <span className="text-xs font-medium">用户上传真实路径</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              用户自愿回填自己的真实 5 年轨迹,沉淀为平台私有数据集 ——
              用得越多、路径越真,反推越准,形成<strong>别人难以复制的网络效应</strong>。
            </p>
          </div>
          <div className="rounded-lg border bg-white p-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">V3 合作</Badge>
              <span className="text-xs font-medium">机构脱敏数据</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              与智联、高校就业指导中心对接脱敏真实样本(协商中),全程 k-匿名 ≥1000、不落个人信息 ——
              把基线从"演示"升级为"可核验"。
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          ⚠️ 当前展示为 <strong>V1 演示数据</strong>:用于验证算法与交互,师兄路径为按公开分布生成的模拟样本,不代表特定真实个人。
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold text-brand-600">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{desc}</CardDescription>
      </CardContent>
    </Card>
  );
}
