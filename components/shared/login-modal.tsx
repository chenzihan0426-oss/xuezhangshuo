'use client';
/**
 * 全局登录弹窗(手机号 + 验证码 + 匿名试用)
 *
 * 触发方式 1:URL 带 ?login=1 → 自动打开
 * 触发方式 2:任意组件 router.push('?login=1')
 *
 * 登录成功后:关闭 + 移除 ?login=1 + router.refresh()
 *
 * 匿名试用:Supabase 后台 Authentication → Sign In/Up 启用 "Allow anonymous sign-ins"。
 *           1 秒拿到 session,demo / 评委试用首选。
 */
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Phone, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PHONE_RE = /^1[3-9]\d{9}$/;
const COOLDOWN_SECONDS = 60;

export default function LoginModal() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [anonLoading, setAnonLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.get('login') === '1') setOpen(true);
  }, [params]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  function close() {
    setOpen(false);
    setStep('phone');
    setCode('');
    setError(null);
    if (params.get('login')) {
      const sp = new URLSearchParams(Array.from(params.entries()));
      sp.delete('login');
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }
  }

  async function loginAnonymously() {
    setError(null);
    setAnonLoading(true);
    try {
      const res = await fetch('/api/auth/anonymous', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.hint ?? body.error ?? '匿名登录失败');
      }
      close();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '匿名登录失败');
    } finally {
      setAnonLoading(false);
    }
  }

  async function sendCode() {
    setError(null);
    if (!PHONE_RE.test(phone)) {
      setError('手机号格式不对');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/auth/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? '发送失败 (请在 Supabase 启用 Phone provider)');
      }
      setStep('code');
      setCooldown(COOLDOWN_SECONDS);
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败');
    } finally {
      setSending(false);
    }
  }

  async function verify() {
    setError(null);
    if (code.length !== 6) {
      setError('请输入 6 位验证码');
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? '验证失败');
      }
      close();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '验证失败');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>登录学长说</DialogTitle>
          <DialogDescription>
            点击「快速试用」立刻进入(demo 模式),或用手机号登录。
          </DialogDescription>
        </DialogHeader>

        {step === 'phone' ? (
          <div className="space-y-3">
            {/* 快速试用(匿名登录,demo 用)*/}
            <Button
              variant="outline"
              className="w-full border-brand-400 bg-brand-50/40 hover:bg-brand-50"
              onClick={loginAnonymously}
              disabled={anonLoading}
            >
              {anonLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4 text-brand-600" />
              )}
              快速试用(不填手机号)
            </Button>
            <div className="relative flex items-center text-xs text-muted-foreground">
              <div className="flex-grow border-t" />
              <span className="px-2">或</span>
              <div className="flex-grow border-t" />
            </div>

            <div>
              <Label htmlFor="phone">手机号</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="1[3-9][0-9]{9}"
                  placeholder="138 xxxx xxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\s/g, ''))}
                  className="pl-10"
                />
              </div>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button className="w-full" onClick={sendCode} disabled={sending || !phone}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              发送验证码
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              点击发送即视为同意《用户协议》和《隐私政策》
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="code">已发送到 {phone} 的 6 位验证码</Label>
              <Input
                id="code"
                inputMode="numeric"
                maxLength={6}
                placeholder="6 位数字"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="mt-1 text-center text-lg tracking-widest"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button className="w-full" onClick={verify} disabled={verifying || code.length !== 6}>
              {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              登录
            </Button>
            <div className="flex justify-between text-xs text-muted-foreground">
              <button onClick={() => setStep('phone')} className="hover:text-foreground">
                ← 换号码
              </button>
              <button
                onClick={sendCode}
                disabled={cooldown > 0 || sending}
                className="hover:text-foreground disabled:opacity-50"
              >
                {cooldown > 0 ? `${cooldown}s 后重发` : '重新发送'}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
