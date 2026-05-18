'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function PaywallModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [creating, setCreating] = useState(false);

  async function buy(product: 'membership_annual' | 'single_unlock') {
    setCreating(true);
    try {
      const res = await fetch('/api/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_type: product, payment_method: 'wechat' }),
      });
      const data = await res.json();
      if (data?.qr_url) window.location.href = data.qr_url;
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>解锁全部 200 条师兄路径</DialogTitle>
          <DialogDescription>
            免费版只展示头部 20 条;付费后看完整 200 条,以及每条路径的完整 5 年时间线。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => buy('single_unlock')}
            disabled={creating}
            className="rounded-xl border p-4 text-left hover:border-brand-500"
          >
            <div className="font-semibold">¥4.9</div>
            <div className="mt-1 text-xs text-muted-foreground">单次解锁这一次反推</div>
          </button>
          <button
            onClick={() => buy('membership_annual')}
            disabled={creating}
            className="rounded-xl border-2 border-brand-500 bg-brand-50/30 p-4 text-left"
          >
            <div className="font-semibold">¥99/年 <span className="text-xs text-brand-600">(推荐)</span></div>
            <div className="mt-1 text-xs text-muted-foreground">年卡 · 平均 ¥8/月,无限反推</div>
          </button>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          支付即视为同意《会员协议》与《退款规则》。
        </p>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>稍后再说</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
