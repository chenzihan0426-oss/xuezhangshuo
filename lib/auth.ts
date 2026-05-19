/**
 * 服务端 auth helpers
 *
 * - requireUserOrRedirect: 页面/Server Component 用。未登录 → 跳转
 * - withAuth:                API Route 用的 HOF。未登录 → 返回 401 JSON
 */
import { redirect } from 'next/navigation';
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from './supabase-server';

export async function getServerUser() {
  const sb = createSupabaseServerClient();
  const { data } = await sb.auth.getUser();
  return data.user;
}

export async function requireUserOrRedirect() {
  const user = await getServerUser();
  if (!user) redirect('/?login=1');
  return user;
}

type AuthedUser = NonNullable<Awaited<ReturnType<typeof getServerUser>>>;

export function withAuth<Ctx = unknown>(
  handler: (req: NextRequest, ctx: Ctx, user: AuthedUser) => Promise<Response> | Response,
) {
  return async (req: NextRequest, ctx: Ctx) => {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    return handler(req, ctx, user);
  };
}

/**
 * 旧名兼容:页面默认行为是 redirect,API 路由用 withAuth 替代。
 */
export const requireUser = requireUserOrRedirect;

/**
 * API Route 专用:未登录返回 NextResponse 401,登录则返回 user。
 * 用法:
 *   const user = await apiRequireUser();
 *   if (user instanceof NextResponse) return user;
 *   // 这里 user 一定是登录用户
 */
export async function apiRequireUser() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  return user;
}
