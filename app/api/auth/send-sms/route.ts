/**
 * POST /api/auth/send-sms
 * 走 Supabase 的 phone OTP 流程(默认接阿里云短信通道,在 Supabase 控制台配置)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const Body = z.object({ phone: z.string().regex(/^1[3-9]\d{9}$/) });

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });

  const sb = createSupabaseServerClient();
  const { error } = await sb.auth.signInWithOtp({ phone: parsed.data.phone });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
