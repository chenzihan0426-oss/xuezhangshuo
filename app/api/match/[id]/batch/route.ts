/**
 * GET /api/match/[id]/batch
 * 返回与当前 match「同一次提交」的所有 match(用于结果页 OfferTabs / 对比 Modal)。
 *
 * 归组策略(按可靠性顺序):
 *   1) batch_id 优先(POST /api/match 起统一写入,精确归组)
 *   2) 老数据 batch_id 为 NULL 或字段不存在 → fallback 用 created_at ±5s 窗口
 *
 * 最后再做去重:同一 (company_name + position_category) 只保留 created_at 最新的一条。
 * 这样即使 zombie 自愈、用户双击或老数据窗口重叠,UI 上也只显示用户实际填的那几个 offer。
 *
 * 容错:如果数据库还没跑 0005 迁移(batch_id 列不存在),select 会失败 → 自动降级到无 batch_id 模式。
 */
import { NextResponse } from 'next/server';
import { apiRequireUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const FALLBACK_WINDOW_MS = 5_000;

const BASE_COLS =
  'id, created_at, status, correction_data, same_count, higher_count, lower_count, ' +
  'user_offers(company_name, company_id, position_category, level, salary_min, salary_max)';

function isMissingColumnError(err: any, column: string): boolean {
  if (!err) return false;
  if (err.code === '42703') return true;
  const msg = String(err.message ?? '').toLowerCase();
  return msg.includes(column.toLowerCase()) && (msg.includes('column') || msg.includes('does not exist'));
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await apiRequireUser();
  if (user instanceof NextResponse) return user;

  const sb = createSupabaseServerClient();

  // 先尝试带 batch_id 读当前 match
  let curBatchId: string | null = null;
  let curCreatedAt: string | null = null;
  let hasBatchIdColumn = true;
  {
    const { data, error } = await sb
      .from('matches')
      .select('id, created_at, batch_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error && isMissingColumnError(error, 'batch_id')) {
      hasBatchIdColumn = false;
      const r2 = await sb
        .from('matches')
        .select('id, created_at')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!r2.data) return NextResponse.json({ items: [] });
      curCreatedAt = (r2.data as any).created_at;
    } else if (error) {
      return NextResponse.json({ items: [] });
    } else {
      if (!data) return NextResponse.json({ items: [] });
      curBatchId = (data as any).batch_id ?? null;
      curCreatedAt = (data as any).created_at;
    }
  }

  const selectCols = hasBatchIdColumn ? `${BASE_COLS}, batch_id` : BASE_COLS;
  let query = sb.from('matches').select(selectCols).eq('user_id', user.id);

  if (hasBatchIdColumn && curBatchId) {
    query = query.eq('batch_id', curBatchId);
  } else {
    // Fallback:无 batch_id 列、或当前 match 没归过 batch,用 ±5s 窗口
    const t = curCreatedAt ? new Date(curCreatedAt).getTime() : Date.now();
    const lo = new Date(t - FALLBACK_WINDOW_MS).toISOString();
    const hi = new Date(t + FALLBACK_WINDOW_MS).toISOString();
    query = query.gte('created_at', lo).lte('created_at', hi);
    if (hasBatchIdColumn) {
      // 当前没 batch_id 的老数据,跨批的精确归组也别拉进来
      query = query.is('batch_id', null);
    }
  }

  const { data } = await query.order('created_at', { ascending: true });

  // 去重:同 (company_name + position_category) 只保留最新的一条
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
