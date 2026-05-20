/**
 * GET /api/match/[id]
 * 包含 zombie 自愈:如果一条 match 创建超过 30s 还在 computing,
 * 说明之前那次 POST 的 runMatchInBackground 被 Vercel Serverless 提前杀掉,
 * 这里同步重跑一次,把 status 修过来。这样用户刷新结果页就能恢复,
 * 不需要重新走录入流程。
 */
import { NextResponse } from 'next/server';
import { apiRequireUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { runMatchInBackground } from '@/lib/match-runner';
import type { UserBackground, UserOffer } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ZOMBIE_THRESHOLD_MS = 30_000;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await apiRequireUser();
  if (user instanceof NextResponse) return user;

  const sb = createSupabaseServerClient();
  let { data, error } = await sb
    .from('matches')
    .select('*, user_offers(*)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // zombie 自愈:status=computing 且超过阈值 → 同步重跑
  if (data.status === 'computing') {
    const ageMs = Date.now() - new Date((data as any).created_at).getTime();
    if (ageMs > ZOMBIE_THRESHOLD_MS) {
      const offer = (data as any).user_offers;
      if (offer) {
        // 拼出 runMatchInBackground 需要的输入。background 从 users 表读。
        const { data: u } = await sb
          .from('users')
          .select('school_id, school_tier, major_id, major_category, education_level, graduation_year, gpa_band')
          .eq('id', user.id)
          .maybeSingle();
        if (u) {
          console.log(`[GET /api/match/${params.id}] zombie detected (age=${ageMs}ms), rerunning`);
          await runMatchInBackground(params.id as string, {
            background: { ...u, internships: [] } as UserBackground,
            offer: offer as UserOffer & { id: string },
            user_offer_db_id: offer.id,
          });
          // 重读最新 row
          const refresh = await sb
            .from('matches')
            .select('*, user_offers(*)')
            .eq('id', params.id)
            .eq('user_id', user.id)
            .maybeSingle();
          if (refresh.data) data = refresh.data;
        }
      }
    }
  }

  if (data.status === 'completed') {
    const allIds = (data.matched_path_ids ?? []) as string[];
    const { data: paths } = await sb
      .from('senior_paths')
      .select(
        'id, school_tier, education_level, major_category, start_year, first_company_tier, first_industry, ' +
          'first_position_category, first_level, five_year_company_tier, five_year_industry, ' +
          'five_year_level, five_year_salary, job_changes, industry_changes, path_history',
      )
      .in('id', allIds.slice(0, 200));
    return NextResponse.json({ ...data, paths });
  }

  return NextResponse.json(data);
}
