/**
 * M5 结果页(SSR + 客户端轮询直到 status=completed)
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser } from '@/lib/auth';
import ResultClient from './result-client';

export async function generateMetadata({
  params,
}: {
  params: { matchId: string };
}): Promise<Metadata> {
  const sb = createSupabaseServerClient();
  const { data } = await sb
    .from('matches')
    .select('user_offers(*)')
    .eq('id', params.matchId)
    .maybeSingle();
  const offer = (data as any)?.user_offers;
  const title = offer
    ? `${offer.company_name ?? '#' + offer.company_id} · ${offer.position_category} 的 5 年反推`
    : '反推结果 | 学长说';
  return {
    title,
    description: '同/高/低背景师兄 5 年后画像,带环境校正,可逐条查看时间线。',
    robots: { index: false, follow: false },
  };
}

export default async function ResultPage({ params }: { params: { matchId: string } }) {
  await requireUser();
  const sb = createSupabaseServerClient();
  const { data: match } = await sb
    .from('matches')
    .select('*, user_offers(*)')
    .eq('id', params.matchId)
    .maybeSingle();
  if (!match) notFound();

  return <ResultClient matchId={params.matchId} initial={match} />;
}
