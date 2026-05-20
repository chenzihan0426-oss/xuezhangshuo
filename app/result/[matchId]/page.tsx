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

  // 已完成的 match 直接连 paths 一起 SSR 出去,避免客户端再走一轮轮询拿数据
  let initial: any = match;
  if (match.status === 'completed') {
    const allIds = ((match as any).matched_path_ids ?? []) as string[];
    if (allIds.length) {
      const { data: paths } = await sb
        .from('senior_paths')
        .select(
          'id, school_tier, education_level, major_category, start_year, first_company_tier, first_industry, ' +
            'first_position_category, first_level, five_year_company_tier, five_year_industry, ' +
            'five_year_level, five_year_salary, job_changes, industry_changes, path_history',
        )
        .in('id', allIds.slice(0, 200));
      initial = { ...match, paths: paths ?? [] };
    } else {
      initial = { ...match, paths: [] };
    }
  }

  return <ResultClient matchId={params.matchId} initial={initial} />;
}
