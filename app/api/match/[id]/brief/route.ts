/**
 * GET /api/match/[id]/brief
 * AI 联网检索:该 offer 公司 + 行业的近期真实动态。
 *
 * 缓存:命中 correction_data.ai_brief(非降级态)直接返回;否则调通义后写回。
 * 降级态(no_key / timeout / error)不写库,下次刷新可重试。
 * 校正分数完全不受影响 —— 本接口只补充解读。
 */
import { NextResponse } from 'next/server';
import { apiRequireUser } from '@/lib/auth';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server';
import { generateCompanyBrief } from '@/lib/tongyi';

export const runtime = 'nodejs';
export const maxDuration = 60;
// 函数尽量跑在离阿里云(中国)近的区域,降低跨境联网延迟。
// Hobby 计划会忽略此设置(仍用默认区域),Pro 计划生效。
export const preferredRegion = ['hkg1', 'sin1'];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await apiRequireUser();
  if (user instanceof NextResponse) return user;

  const sb = createSupabaseServerClient();
  const { data: match, error } = await sb
    .from('matches')
    .select('id, correction_data, user_offers(company_name, company_id, position_category)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) {
    console.error('[match/[id]/brief]', error);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
  if (!match) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const cd = (match as any).correction_data ?? {};
  // 缓存命中(已生成且非降级态)
  if (cd.ai_brief && !cd.ai_brief.degraded) {
    return NextResponse.json(cd.ai_brief);
  }

  const company = (match as any).user_offers?.company_name?.trim();
  const industry = cd.offer_industry ?? 'internet';
  const position = (match as any).user_offers?.position_category;
  if (!company) {
    return NextResponse.json({ found: false, summary: '', events: [], degraded: 'error' });
  }

  const brief = await generateCompanyBrief({ company, industry, position });

  // 只缓存非降级态(真结果或诚实的"未检索到");降级态不写库,下次可重试
  if (!brief.degraded) {
    const svc = createSupabaseServiceClient();
    await svc
      .from('matches')
      .update({ correction_data: { ...cd, ai_brief: brief } })
      .eq('id', params.id);
  }

  return NextResponse.json(brief);
}
