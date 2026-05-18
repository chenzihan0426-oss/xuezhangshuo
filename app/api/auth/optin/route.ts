/**
 * POST /api/auth/optin  授权把自己的路径加入未来的样本池
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST() {
  const user = await requireUser();
  const sb = createSupabaseServerClient();
  const { error } = await sb
    .from('users')
    .update({ opt_in_consent: true, opt_in_at: new Date().toISOString() })
    .eq('id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await requireUser();
  const sb = createSupabaseServerClient();
  await sb.from('users').update({ opt_in_consent: false, opt_in_at: null }).eq('id', user.id);
  return NextResponse.json({ ok: true });
}
