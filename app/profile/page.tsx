/**
 * M7 个人中心 (专业版工作台)
 */
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  FileText,
  ChevronRight,
  Clock,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

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
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"></div>
          工作台数据加载中…
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto mt-20 max-w-md text-center">
        <div className="mb-4 inline-flex rounded-full bg-slate-100 p-4 text-slate-400">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">尚未登录</h2>
        <p className="mt-2 text-sm text-slate-500">请先登录以查看您的评估报告库。</p>
        <Button asChild className="mt-6 bg-brand-600 hover:bg-brand-700">
          <Link href="/profile?login=1">前往登录 / 注册</Link>
        </Button>
      </div>
    );
  }

  const memberLabel = me.membership_tier === 'free' ? '标准用户' : `专业版会员(${me.membership_tier})`;

  return (
    <div className="min-h-screen -my-6 bg-slate-50 pb-20 font-sans">
      {/* 暗色 hero 头条带 */}
      <div className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 md:flex-row md:items-end md:justify-between md:py-14">
          <div>
            <Badge variant="outline" className="mb-3 border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              <ShieldCheck size={12} className="mr-1.5" /> 已认证身份
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">我的工作台</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
              <span>当前身份: <strong className="text-white">{memberLabel}</strong></span>
              {me.id && (
                <>
                  <span className="text-slate-600">|</span>
                  <span className="font-mono text-xs">ID: {String(me.id).slice(0, 8).toUpperCase()}</span>
                </>
              )}
              {me.phone || me.email ? (
                <>
                  <span className="text-slate-600">|</span>
                  <span>{me.phone || me.email}</span>
                </>
              ) : null}
            </p>
          </div>
          <Button asChild className="bg-brand-600 shadow-sm hover:bg-brand-700">
            <Link href="/input">
              <FileText className="mr-2 h-4 w-4" /> 新建评估报告
            </Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-8 md:px-8 md:pt-12">

        <div className="grid gap-8 lg:grid-cols-3">
          {/* 左侧主要内容:报告列表 */}
          <div className="space-y-6 lg:col-span-2">
            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
                <h2 className="text-base font-bold text-slate-900">历史评估报告</h2>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">{history.length} 份</Badge>
              </div>

              <div className="divide-y divide-slate-100 bg-white">
                {history.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-slate-500">
                    <div className="mb-3 inline-flex rounded-full bg-slate-50 p-3">
                      <FileText size={24} className="text-slate-300" />
                    </div>
                    <p>暂无评估报告,立刻创建一个对标档案吧。</p>
                  </div>
                ) : (
                  history.map((m) => (
                    <Link
                      key={m.id}
                      href={`/result/${m.id}`}
                      className="group flex flex-col gap-3 p-5 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 transition-colors group-hover:text-brand-600">
                            报告 ID: {m.id.split('-')[0].toUpperCase()}
                          </span>
                          {m.status === 'completed' ? (
                            <Badge className="h-5 border-emerald-200 bg-emerald-50 px-1.5 text-[10px] font-normal text-emerald-700 hover:bg-emerald-50">
                              已生成
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
                              {m.status === 'computing' ? '处理中' : m.status}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {new Date(m.created_at).toLocaleString('zh-CN')}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span>核心样本: {m.same_count} 人</span>
                          <span>对标库: {m.same_count + m.higher_count + m.lower_count} 人</span>
                        </div>
                      </div>
                      <div className="hidden text-slate-400 transition-colors group-hover:text-brand-600 sm:block">
                        <ChevronRight size={20} />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Card>

            {/* 档案摘要 */}
            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <div className="border-b border-slate-100 bg-white px-6 py-4">
                <h2 className="text-base font-bold text-slate-900">我的背景档案</h2>
              </div>
              <CardContent className="grid grid-cols-2 gap-3 bg-white p-6 text-sm">
                <Field label="学校 tier" v={`T${me.school_tier ?? '-'}`} />
                <Field label="专业大类" v={me.major_category ?? '-'} />
                <Field label="学历" v={me.education_level ?? '-'} />
                <Field label="毕业年份" v={String(me.graduation_year ?? '-')} />
                <Field label="GPA" v={me.gpa_band ?? '-'} />
                <Field label="opt-in 授权" v={me.opt_in_consent ? '✅ 已授权' : '⛔ 未授权'} />
              </CardContent>
            </Card>
          </div>

          {/* 右侧:设置与授权 */}
          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <div className="border-b border-slate-100 bg-white px-6 py-4">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Settings size={18} className="text-slate-500" /> 数据与隐私设置
                </h2>
              </div>
              <CardContent className="space-y-6 bg-white p-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">众包数据授权 (Opt-in)</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    参与数据共建,您的脱敏履历将用于提升整体模型的准确度。授权状态下您可享受更深度的对标特权。
                  </p>
                  <Button
                    variant={me.opt_in_consent ? 'outline' : 'default'}
                    className={`mt-4 w-full text-sm ${
                      me.opt_in_consent
                        ? 'border-slate-300 text-slate-600 hover:bg-slate-50'
                        : 'bg-brand-600 text-white hover:bg-brand-700'
                    }`}
                    onClick={async () => {
                      await fetch('/api/auth/optin', { method: me.opt_in_consent ? 'DELETE' : 'POST' });
                      location.reload();
                    }}
                  >
                    {me.opt_in_consent ? '撤销授权 (降级为标准版)' : '开启授权 (参与共建)'}
                  </Button>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900">账号基础信息</h3>
                  <div className="mt-3 space-y-2 text-xs">
                    <Field label="当前账号" v={<span className="font-medium text-slate-700">{me.phone || me.email || '未绑定'}</span>} />
                    {me.created_at && (
                      <Field label="注册时间" v={new Date(me.created_at).toLocaleDateString('zh-CN')} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, v }: { label: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900">{v}</span>
    </div>
  );
}
