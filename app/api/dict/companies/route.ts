import { NextResponse } from 'next/server';
import { createSupabaseAnonClient } from '@/lib/supabase-server';
import { escapeIlike } from '@/lib/utils';

export const revalidate = 3600;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();
  const sb = createSupabaseAnonClient();
  let query = sb.from('companies').select('id, name, tier, industry').order('tier').limit(200);
  if (q) query = query.ilike('name', `%${escapeIlike(q)}%`);
  const { data, error } = await query;
  if (error) {
    console.error('[dict/companies]', error);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}
