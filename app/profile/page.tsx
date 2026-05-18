/**
 * M7 个人中心
 */
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const [me, setMe] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/user/me').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/user/history').then((r) => (r.ok ? r.json() : { items: [] })).catch(() => ({ items: [] })),
    ]).then(([m, h]) => {
      setMe(m);
      setHistory(h?.items ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">加载中…</p>;
  }
  if (!me) {
    return (
      <p className="text-sm text-muted-foreground">
        还没登录,先 <Link href="/profile?login=1" className="text-brand-600 underline">去登录</Link>
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>我的</CardTitle>
          <CardDescription>{me.phone}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <Field label="学校 tier" v={`T${me.school_tier ?? '-'}`} />
          <Field label="专业大类" v={me.major_category ?? '-'} />
          <Field label="学历" v={me.education_level ?? '-'} />
          <Field label="毕业年份" v={String(me.graduation_year ?? '-')} />
          <Field label="GPA" v={me.gpa_band ?? '-'} />
          <Field label="会员" v={<Badge variant={me.membership_tier === 'free' ? 'secondary' : 'default'}>
            {me.membership_tier}
          </Badge>} />
          <Field label="opt-in" v={me.opt_in_consent ? '✅ 已授权' : '⛔ 未授权'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>反推历史</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {history.length === 0 && <p className="text-muted-foreground">还没有反推过 offer</p>}
          {history.map((m) => (
            <Link
              key={m.id}
              href={`/result/${m.id}`}
              className="flex items-center justify-between rounded-md border p-3 hover:border-brand-500"
            >
              <div>
                <div className="font-medium">
                  {new Date(m.created_at).toLocaleString('zh-CN')}
                </div>
                <div className="text-xs text-muted-foreground">
                  同 {m.same_count} · 高 {m.higher_count} · 低 {m.lower_count}
                </div>
              </div>
              <Badge variant={m.status === 'completed' ? 'success' : 'secondary'}>
                {m.status}
              </Badge>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Button variant="outline" onClick={async () => {
            await fetch('/api/auth/optin', { method: me.opt_in_consent ? 'DELETE' : 'POST' });
            location.reload();
          }}>
            {me.opt_in_consent ? '撤销 opt-in 授权' : '我要 opt-in'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, v }: { label: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b py-2 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{v}</span>
    </div>
  );
}
