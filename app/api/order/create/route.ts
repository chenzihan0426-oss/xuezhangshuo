/**
 * POST /api/order/create  V1 仅创建订单记录,真实支付 V1.5 接入
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiRequireUser } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const PRODUCT_PRICES: Record<string, number> = {
  membership_annual: 99,
  membership_monthly: 19.9,
  single_unlock: 4.9, // 单次解锁完整 200 条路径
};

const Body = z.object({
  product_type: z.enum(['membership_annual', 'membership_monthly', 'single_unlock']),
  payment_method: z.enum(['wechat', 'alipay']).optional(),
});

export async function POST(req: NextRequest) {
  const user = await apiRequireUser();
  if (user instanceof NextResponse) return user;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'validation' }, { status: 400 });

  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from('orders')
    .insert({
      user_id: user.id,
      product_type: parsed.data.product_type,
      amount: PRODUCT_PRICES[parsed.data.product_type],
      payment_method: parsed.data.payment_method ?? 'wechat',
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    order_id: data.id,
    amount: data.amount,
    qr_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/${data.id}`, // V1 占位
  });
}
