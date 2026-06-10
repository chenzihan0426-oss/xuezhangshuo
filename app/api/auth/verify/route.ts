/**
 * POST /api/auth/verify
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server';

const Body = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/),
  code: z.string().length(6),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const sb = createSupabaseServerClient();
  const { data, error } = await sb.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.code,
    type: 'sms',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // 首次登录:在 users 表也建一行。RLS 不允许用户自插(users 表无 INSERT 策略),走 service client
  if (data.user) {
    const svc = createSupabaseServiceClient();
    const { error: upsertErr } = await svc
      .from('users')
      .upsert({ id: data.user.id, phone: parsed.data.phone }, { onConflict: 'id' });
    if (upsertErr) {
      console.error('[auth/verify] users upsert failed', upsertErr);
      return NextResponse.json({ error: 'internal' }, { status: 500 });
    }
  }
  return NextResponse.json({ user_id: data.user?.id });
}
