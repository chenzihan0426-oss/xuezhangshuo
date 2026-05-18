/**
 * POST /api/auth/anonymous  匿名登录(demo / 试用入口)
 *
 * 前提:Supabase 后台 Authentication → Sign In / Up → 启用 "Allow anonymous sign-ins"
 */
import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server';

export async function POST() {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb.auth.signInAnonymously();
  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        hint:
          '请在 Supabase 后台:Authentication → Sign In / Up → 启用 "Allow anonymous sign-ins"',
      },
      { status: 500 },
    );
  }
  // 用 service_role 写业务 users 表(RLS 不让匿名用户自插)
  if (data.user) {
    const svc = createSupabaseServiceClient();
    const { error: upsertErr } = await svc
      .from('users')
      .upsert(
        { id: data.user.id, phone: `anon_${data.user.id.slice(0, 8)}` },
        { onConflict: 'id' },
      );
    if (upsertErr) {
      return NextResponse.json(
        { error: 'failed to sync user row', detail: upsertErr.message },
        { status: 500 },
      );
    }
  }
  return NextResponse.json({ user_id: data.user?.id });
}
