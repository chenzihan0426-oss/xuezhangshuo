/**
 * POST /api/order/callback  支付平台回调(V1.5 接入微信/支付宝)
 * 当前实现:接受 mock 回调,把订单标记为 paid。
 * 安全:V1 阶段用 MOCK_PAY_CALLBACK_SECRET 共享密钥校验;真实接入时换成微信/支付宝 RSA 验签。
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

const Body = z.object({
  order_id: z.string().uuid(),
  payment_transaction_id: z.string().min(1).max(128),
  status: z.enum(['paid', 'failed']),
});

export async function POST(req: NextRequest) {
  const secret = process.env.MOCK_PAY_CALLBACK_SECRET;
  if (!secret || req.headers.get('x-callback-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  const body = parsed.data;

  const svc = createSupabaseServiceClient();
  const update: Record<string, unknown> = {
    payment_transaction_id: body.payment_transaction_id,
    status: body.status,
  };
  if (body.status === 'paid') update.paid_at = new Date().toISOString();

  // 单向状态机:只允许 pending → paid/failed,天然幂等(重放时匹配 0 行)
  const { data, error } = await svc
    .from('orders')
    .update(update)
    .eq('id', body.order_id)
    .eq('status', 'pending')
    .select()
    .maybeSingle();
  if (error) {
    console.error('[order/callback]', error);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
  if (!data) {
    // 不存在或已终态:幂等返回 ok,避免支付平台无限重试
    return NextResponse.json({ ok: true, idempotent: true });
  }

  // 若为会员订单,顺手给 user 写会员状态
  if (data.product_type === 'membership_annual' && body.status === 'paid') {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    const { error: memberErr } = await svc
      .from('users')
      .update({ membership_tier: 'paid_pro', membership_expires_at: expires.toISOString() })
      .eq('id', data.user_id);
    if (memberErr) console.error('[order/callback] membership update failed', memberErr);
  }
  return NextResponse.json({ ok: true });
}
