/**
 * GET /api/match/[id]/batch
 * 返回与当前 match「同一次提交」的所有 match(用于结果页 OfferTabs)。
 *
 * matches 表没有 batch_id,用「同 user + 创建时间相近(±10s)」圈定:
 * 同一次 POST /api/match 里 N 个 offer 是毫秒级连续插入的,10s 窗口足够把它们圈在一起,
 * 又不会把用户上一次/下一次的提交混进来(两次提交间隔通常远超 10s)。
 */
import { NextResponse } from 'next/server';
import { apiRequireUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const WINDOW_MS = 10_000;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await apiRequireUser();
  if (user instanceof NextResponse) return user;

  const sb = createSupabaseServerClient();
  const { data: cur } = await sb
    .from('matches')
    .select('id, created_at')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!cur) return NextResponse.json({ items: [] });

  const t = new Date((cur as any).created_at).getTime();
  const lo = new Date(t - WINDOW_MS).toISOString();
  const hi = new Date(t + WINDOW_MS).toISOString();

  const { data } = await sb
    .from('matches')
    .select('id, created_at, user_offers(company_name, company_id, position_category)')
    .eq('user_id', user.id)
    .gte('created_at', lo)
    .lte('created_at', hi)
    .order('created_at', { ascending: true });

  const items = (data ?? []).map((m: any) => ({
    id: m.id,
    company_name: m.user_offers?.company_name ?? `#${m.user_offers?.company_id ?? ''}`,
    position_category: m.user_offers?.position_category ?? '',
  }));
  return NextResponse.json({ items });
}
