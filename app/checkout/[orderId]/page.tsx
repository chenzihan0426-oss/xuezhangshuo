/**
 * M8 支付页 (企业级安全收银台 · V1 占位)
 */
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Lock, Receipt, CheckCircle2 } from 'lucide-react';

export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<'pending' | 'paid' | 'failed'>('pending');

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
    setTimeout(() => router.push('/profile'), 1200);
  }

  useEffect(() => { /* 真实场景这里会用 ws/polling 等支付回调 */ }, []);

  return (
    <div className="min-h-screen -my-6 bg-slate-50 font-sans">
      {/* 暗色 hero 头条带 */}
      <div className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-6 py-10 text-center md:py-14">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300 ring-1 ring-brand-400/30">
            <Lock size={22} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">安全收银台</h1>
          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-slate-400">
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-400" /> 256 位企业级加密</span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-400" /> 支付完成 1 秒内回调</span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-400" /> 不留银行卡信息</span>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-8 pb-20 md:pt-12">
        <div className="grid gap-6 md:grid-cols-5">
          <Card className="border-slate-200 shadow-sm md:col-span-2">
            <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Receipt size={18} className="text-slate-500" /> 订单摘要
              </h2>
            </div>
            <CardContent className="space-y-4 p-6 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500">商品名称</span>
                <span className="font-semibold text-slate-900">深度评估报告(专业版)</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-500">订单编号</span>
                <span className="font-mono text-xs text-slate-700">{orderId}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="font-medium text-slate-900">应付总额</span>
                <span className="text-xl font-bold text-brand-600">¥9.90</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm md:col-span-3">
            <CardContent className="flex flex-col items-center justify-center p-8 md:p-12">
              {status === 'pending' ? (
                <>
                  <div className="mb-6 text-sm font-medium text-slate-700">请使用微信扫码支付</div>
                  <div className="relative flex aspect-square w-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
                    <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <ShieldCheck size={12} />
                    </div>
                    <div className="grid grid-cols-4 grid-rows-4 gap-1 opacity-20">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className="h-6 w-6 bg-slate-900"></div>
                      ))}
                    </div>
                  </div>
                  <Button className="mt-8 w-full max-w-[200px] bg-brand-600 text-white hover:bg-brand-700" onClick={fakePaid}>
                    (演示)模拟支付成功
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CheckCircle2 size={64} className="mb-4 text-emerald-500" />
                  <h3 className="text-xl font-bold text-slate-900">支付成功</h3>
                  <p className="mt-2 text-sm text-slate-500">报告生成中,即将为您跳转…</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
