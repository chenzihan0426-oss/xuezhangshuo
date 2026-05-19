import { NextResponse } from 'next/server';
import { apiRequireUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  const user = await apiRequireUser();
  if (user instanceof NextResponse) return user;
  const sb = createSupabaseServerClient();
  const { data } = await sb
    .from('matches')
    .select('id, status, same_count, higher_count, lower_count, created_at, correction_data')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  return NextResponse.json({ items: data ?? [] });
}
