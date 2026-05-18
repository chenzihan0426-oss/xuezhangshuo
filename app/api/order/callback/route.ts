/**
 * POST /api/order/callback  支付平台回调(V1.5 接入微信/支付宝)
 * 当前实现:接受 mock 回调,把订单标记为 paid。
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  // TODO: 实际接入时必须验证签名(微信/支付宝 RSA / SHA256)
  const body = (await req.json()) as {
    order_id: string;
    payment_transaction_id: string;
    status: 'paid' | 'failed';
  };

  if (!body?.order_id) return NextResponse.json({ error: 'missing order_id' }, { status: 400 });

  const svc = createSupabaseServiceClient();
  const update: Record<string, unknown> = {
    payment_transaction_id: body.payment_transaction_id,
    status: body.status,
  };
  if (body.status === 'paid') update.paid_at = new Date().toISOString();

  const { data, error } = await svc
    .from('orders')
    .update(update)
    .eq('id', body.order_id)
    .select()
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: error?.message ?? 'not_found' }, { status: 500 });

  // 若为会员订单,顺手给 user 写会员状态
  if (data.product_type === 'membership_annual' && body.status === 'paid') {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    await svc
      .from('users')
      .update({ membership_tier: 'paid_pro', membership_expires_at: expires.toISOString() })
      .eq('id', data.user_id);
  }
  return NextResponse.json({ ok: true });
}
