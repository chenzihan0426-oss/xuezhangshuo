/**
 * GET /api/match/[id]
 */
import { NextResponse } from 'next/server';
import { apiRequireUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await apiRequireUser();
  if (user instanceof NextResponse) return user;

  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from('matches')
    .select('*, user_offers(*)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (data.status === 'completed') {
    const allIds = (data.matched_path_ids ?? []) as string[];
    const { data: paths } = await sb
      .from('senior_paths')
      .select(
        'id, school_tier, major_category, start_year, first_company_tier, first_industry, ' +
          'first_position_category, first_level, five_year_company_tier, five_year_industry, ' +
          'five_year_level, five_year_salary, job_changes, industry_changes, path_history',
      )
      .in('id', allIds.slice(0, 200));
    return NextResponse.json({ ...data, paths });
  }

  return NextResponse.json(data);
}
