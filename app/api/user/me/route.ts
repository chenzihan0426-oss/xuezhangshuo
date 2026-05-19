import { NextRequest, NextResponse } from 'next/server';
import { apiRequireUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  const user = await apiRequireUser();
  if (user instanceof NextResponse) return user;
  const sb = createSupabaseServerClient();
  const { data } = await sb.from('users').select('*').eq('id', user.id).maybeSingle();
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const user = await apiRequireUser();
  if (user instanceof NextResponse) return user;
  const patch = await req.json();
  const allow = ['school_id', 'school_tier', 'major_id', 'major_category',
    'education_level', 'graduation_year', 'gender', 'gpa_band'];
  const safe: Record<string, unknown> = {};
  for (const k of allow) if (k in patch) safe[k] = patch[k];

  const sb = createSupabaseServerClient();
  const { data, error } = await sb.from('users').update(safe).eq('id', user.id).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
