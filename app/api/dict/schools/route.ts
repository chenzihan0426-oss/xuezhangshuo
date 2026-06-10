import { NextResponse } from 'next/server';
import { createSupabaseAnonClient } from '@/lib/supabase-server';
import { escapeIlike } from '@/lib/utils';

export const revalidate = 3600; // 1h cache(用无 cookie 客户端,路由保持 static 才生效)

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim();
  const sb = createSupabaseAnonClient();
  let query = sb.from('schools').select('id, name, tier, province').order('tier').limit(200);
  if (q) query = query.ilike('name', `%${escapeIlike(q)}%`);
  const { data, error } = await query;
  if (error) {
    console.error('[dict/schools]', error);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}
