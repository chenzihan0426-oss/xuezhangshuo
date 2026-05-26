/**
 * GET /api/match/[id]/batch
 * 返回与当前 match「同一次提交」的所有 match(用于结果页 OfferTabs / 对比 Modal)。
 *
 * 归组策略(按可靠性顺序):
 *   1) batch_id 优先(POST /api/match 起统一写入,精确归组)
 *   2) 老数据 batch_id 为 NULL → fallback 用 created_at ±5s 窗口
 *
 * 最后再做去重:同一 (company_name + position_category) 只保留 created_at 最新的一条。
 * 这样即使 zombie 自愈或老数据窗口重叠,UI 上也只显示用户实际填的那几个 offer。
 */
import { NextResponse } from 'next/server';
import { apiRequireUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const FALLBACK_WINDOW_MS = 5_000;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await apiRequireUser();
  if (user instanceof NextResponse) return user;

  const sb = createSupabaseServerClient();
  const { data: cur } = await sb
    .from('matches')
    .select('id, created_at, batch_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!cur) return NextResponse.json({ items: [] });

  const curBatchId = (cur as any).batch_id as string | null;
  const SELECT_COLS =
    'id, created_at, batch_id, status, correction_data, same_count, higher_count, lower_count, ' +
    'user_offers(company_name, company_id, position_category, level, salary_min, salary_max)';

  let query = sb.from('matches').select(SELECT_COLS).eq('user_id', user.id);

  if (curBatchId) {
    // 精确归组:同 batch_id
    query = query.eq('batch_id', curBatchId);
  } else {
    // Fallback:老数据无 batch_id,用 created_at ±5s 窗口
    const t = new Date((cur as any).created_at).getTime();
    const lo = new Date(t - FALLBACK_WINDOW_MS).toISOString();
    const hi = new Date(t + FALLBACK_WINDOW_MS).toISOString();
    query = query
      .is('batch_id', null) // 不要把其他批次的精确归组结果也拉过来
      .gte('created_at', lo)
      .lte('created_at', hi);
  }

  const { data } = await query.order('created_at', { ascending: true });

  // 去重:同 (company_name + position_category) 只保留最新的一条
  // 防御场景:zombie 自愈、用户误双击提交、老数据窗口误圈等
  const byKey = new Map<string, any>();
  for (const m of data ?? []) {
    const offer = (m as any).user_offers;
    const key = `${offer?.company_name ?? ''}__${offer?.position_category ?? ''}`;
    const prev = byKey.get(key);
    if (!prev || new Date((m as any).created_at) > new Date(prev.created_at)) {
      byKey.set(key, m);
    }
  }

  const items = [...byKey.values()].map((m: any) => {
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
