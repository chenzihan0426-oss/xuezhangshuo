/**
 * M11 分享页(公开,不需要登录,匿名展示一张卡片)
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

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

  return (
    <div className="mx-auto max-w-md space-y-6">
      <Card className="bg-gradient-to-br from-brand-50 to-white">
        <CardHeader>
          <CardTitle className="text-base">某位同学反推了这个 offer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-lg font-bold">
            {off?.company_name ?? '#' + off?.company_id} · {off?.position_category}
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">同 {data.same_count}</Badge>
            <Badge variant="outline">高 {data.higher_count}</Badge>
            <Badge variant="outline">低 {data.lower_count}</Badge>
          </div>

          <div className="rounded-xl bg-white p-4 text-sm">
            <div className="text-muted-foreground">环境校正后评分</div>
            <div className="mt-1 text-3xl font-bold text-brand-600">
              {cd.corrected_score ?? '-'}
              <span className="ml-2 text-sm text-muted-foreground">
                ({delta > 0 ? '+' : ''}{delta.toFixed?.(1) ?? 0})
              </span>
            </div>
            <p className="mt-2 text-xs">{cd.explanation}</p>
          </div>

          <Button asChild className="w-full">
            <Link href="/input">我也来反推一个</Link>
          </Button>
        </CardContent>
      </Card>
      <p className="px-1 text-[11px] leading-snug text-muted-foreground">
        🔍 V1 演示数据为模拟数据(基于公开就业报告分布生成),正式版将对接智联真实合作数据。
      </p>
    </div>
  );
}
