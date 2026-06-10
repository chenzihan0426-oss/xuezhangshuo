/**
 * POST /api/order/mock-pay  V1 演示支付:本人对自己的 pending 订单一键标记 paid。
 * 真实支付接入后(V1.5)删除此路由,走 /api/order/callback 验签回调。
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiRequireUser } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

const Body = z.object({ order_id: z.string().uuid() });

export async function POST(req: NextRequest) {
  const user = await apiRequireUser();
  if (user instanceof NextResponse) return user;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const svc = createSupabaseServiceClient();
  // 单向状态机 + 本人订单约束,重放天然幂等
  const { data, error } = await svc
    .from('orders')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_transaction_id: `mock_${parsed.data.order_id.slice(0, 8)}`,
    })
    .eq('id', parsed.data.order_id)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .select()
    .maybeSingle();
  if (error) {
    console.error('[order/mock-pay]', error);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ ok: true, idempotent: true });

  if (data.product_type === 'membership_annual') {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    const { error: memberErr } = await svc
      .from('users')
      .update({ membership_tier: 'paid_pro', membership_expires_at: expires.toISOString() })
      .eq('id', user.id);
    if (memberErr) console.error('[order/mock-pay] membership update failed', memberErr);
  }
  return NextResponse.json({ ok: true });
}
