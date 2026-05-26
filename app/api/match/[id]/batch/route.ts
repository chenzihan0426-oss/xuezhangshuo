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
    .select(
      'id, created_at, status, correction_data, same_count, higher_count, lower_count, ' +
        'user_offers(company_name, company_id, position_category, level, salary_min, salary_max)',
    )
    .eq('user_id', user.id)
    .gte('created_at', lo)
    .lte('created_at', hi)
    .order('created_at', { ascending: true });

  const items = (data ?? []).map((m: any) => {
    const cd = m.correction_data ?? {};
    return {
      id: m.id,
      status: m.status,
      company_name: m.user_offers?.company_name ?? `#${m.user_offers?.company_id ?? ''}`,
      position_category: m.user_offers?.position_category ?? '',
      level: m.user_offers?.level,
      salary_min: m.user_offers?.salary_min,
      salary_max: m.user_offers?.salary_max,
      // 对比所需:
      original_score: cd.original_score,
      corrected_score: cd.corrected_score,
      industry_factor: cd.factors?.industry,
      ai_risk: cd.factors?.ai_risk,
      cohort: cd.factors?.cohort,
      personal_boost: cd.factors?.personal_boost,
      offer_salary_factor: cd.factors?.offer_salary,
      policy_event_count: cd.factors?.policy_events?.length ?? 0,
      salary_p10: cd.salary_p10,
      salary_p50: cd.salary_p50,
      salary_p90: cd.salary_p90,
      ai_senior_salary_mid: cd.ai_brief?.salary_range
        ? ((cd.ai_brief.salary_range.senior_low + cd.ai_brief.salary_range.senior_high) / 2) * 10_000
        : null,
      // AI 公司级精化系数(与反推页 displayCorrected = corrected * ai_company_adjustment 对齐)
      ai_company_adjustment: cd.ai_brief?.correction?.company_adjustment ?? 1,
      match_level: cd.match_level,
      sample_size: cd.sample_size,
      same_count: m.same_count ?? 0,
      higher_count: m.higher_count ?? 0,
      lower_count: m.lower_count ?? 0,
    };
  });
  return NextResponse.json({ items });
}
