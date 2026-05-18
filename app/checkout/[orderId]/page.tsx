/**
 * M8 支付页(V1 占位,V1.5 接入真实微信/支付宝)
 */
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<'pending' | 'paid' | 'failed'>('pending');

  // V1 演示:点击"我已支付"调 callback,直接置为 paid
  async function fakePaid() {
    setStatus('paid');
    await fetch('/api/order/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        payment_transaction_id: `mock_${Date.now()}`,
        status: 'paid',
      }),
    });
    setTimeout(() => router.push('/profile'), 800);
  }

  useEffect(() => { /* 真实场景这里会用 ws/polling 等支付回调 */ }, []);

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">微信支付(演示)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="aspect-square rounded-lg border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
            <div className="mt-16">[ 微信支付二维码 ]</div>
            <div className="mt-2">Order: {orderId}</div>
          </div>
          {status === 'pending' && (
            <Button className="w-full" onClick={fakePaid}>我已支付(演示)</Button>
          )}
          {status === 'paid' && <p className="text-sm text-emerald-600">✅ 支付成功,正在跳转…</p>}
        </CardContent>
      </Card>
    </div>
  );
}
