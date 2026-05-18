import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const revalidate = 3600; // 1h cache

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();
  const sb = createSupabaseServerClient();
  let query = sb.from('schools').select('id, name, tier, province').order('tier').limit(200);
  if (q) query = query.ilike('name', `%${q}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
