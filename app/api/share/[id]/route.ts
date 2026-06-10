/**
 * GET /api/share/[id]  匿名读取 match 的简略数据,用于生成分享卡片(html2canvas)
 */
import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from('matches')
    // 显式列字段:user_offers(*) 会把 user_id 和精确薪资一起带出去,分享卡片用不到
    .select(
      'id, same_count, higher_count, lower_count, correction_data, user_offers(company_id, company_name, position_category, level), created_at',
    )
    .eq('id', params.id)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({
    id: data.id,
    counts: { same: data.same_count, higher: data.higher_count, lower: data.lower_count },
    correction: data.correction_data,
    offer: data.user_offers,
    created_at: data.created_at,
  });
}
