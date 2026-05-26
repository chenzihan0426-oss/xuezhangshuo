/**
 * M2 录入页 (专业工作台版)
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BackgroundForm, { type BackgroundFormState } from './background-form';
import OfferList, { type OfferRow } from './offer-list';
import OptinModal from './optin-modal';
import { GraduationCap, FileText, ShieldCheck, AlertCircle } from 'lucide-react';

// v2 — 升级后旧 draft 自动作废
const DRAFT_KEY = 'xuezhangshuo:input-draft:v2';
const OLD_KEYS = ['xuezhangshuo:input-draft'];

export default function InputPage() {
  const router = useRouter();
  const [background, setBackground] = useState<BackgroundFormState | null>(null);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [optinOpen, setOptinOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState<'edu' | 'offer'>('edu');

  useEffect(() => {
    try {
      OLD_KEYS.forEach((k) => localStorage.removeItem(k));
      const raw = localStorage.getItem(DRAFT_KEY);
      let nextOffers: OfferRow[] = [];
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.background) setBackground(draft.background);
        if (Array.isArray(draft.offers)) nextOffers = draft.offers;
      }

      // 从首页内联表单带过来的公司 + 岗位关键词
      const prefillRaw = localStorage.getItem('xuezhangshuo:home-prefill');
      if (prefillRaw) {
        try {
          const prefill = JSON.parse(prefillRaw) as { company_name?: string; position_keyword?: string };
          if (prefill?.company_name || prefill?.position_keyword) {
            const first = nextOffers[0] ?? {
              company_id: 0,
              company_name: '',
              position_category: '',
              level: 'graduate',
            };
            nextOffers[0] = {
              ...first,
              company_name: prefill.company_name || first.company_name,
              // 关键词不直接写到 position_category(那是枚举),写到自定义 name 让用户能看到
              position_name: prefill.position_keyword || (first as any).position_name,
            } as OfferRow;
            setActiveSection('offer');
          }
        } catch {
          /* ignore parse */
        }
        localStorage.removeItem('xuezhangshuo:home-prefill');
      }

      if (nextOffers.length) setOffers(nextOffers);
    } catch {
      /* ignore */
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ background, offers }));
  }, [background, offers, draftLoaded]);

  const missing = useMemo<string[]>(() => {
    const out: string[] = [];
    if (!background?.school_name?.trim()) out.push('学校名');
    if (!background?.school_tier) out.push('学校层级');
    if (!background?.major_category) out.push('专业大类');
    if (offers.length === 0) out.push('至少 1 个 Offer');
    offers.forEach((o, i) => {
      if (!o.company_name?.trim()) out.push(`Offer ${i + 1}:公司名`);
      if (!o.company_tier) out.push(`Offer ${i + 1}:公司类型`);
      const isCustomCompany = !o.company_id && !!o.company_name?.trim();
      if (isCustomCompany && !o.first_industry) out.push(`Offer ${i + 1}:行业`);
      if (!o.position_category) out.push(`Offer ${i + 1}:岗位大类`);
      if (!o.level) out.push(`Offer ${i + 1}:职级`);
    });
    return out;
  }, [background, offers]);

  const canSubmit = missing.length === 0;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const safeBackground = background
        ? { ...background, major_id: background.major_id || 1 }
        : background;
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ background: safeBackground, offers }),
      });
      if (res.status === 401) {
        router.replace('/input?login=1');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `请求失败:${res.status}`);
      }
      const { match_ids } = await res.json();
      router.push(`/result/${match_ids[0]}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setBackground(null);
    setOffers([]);
  }

  return (
    <div className="min-h-screen -my-6 bg-slate-50 pb-20">
      {/* 暗色 hero 头条带 */}
      <div className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 md:flex-row md:items-end md:justify-between md:py-14">
          <div>
            <Badge variant="outline" className="mb-3 border-brand-400/30 bg-brand-400/10 text-brand-300">
              第 1 步 / 共 2 步
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">创建对标档案</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400 md:text-base">
              完善背景与 Offer 信息,系统将匹配 <strong className="text-white">1000+ 真实样本</strong>,
              生成<strong className="text-white">环境校正后</strong>的对标分析报告。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden flex-col text-right text-xs text-slate-400 sm:flex">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" /> K-匿名 ≥1000 脱敏建模
              </span>
              <span className="mt-1">所有字段仅用于匹配,不会展示给他人</span>
            </div>
            <Button size="sm" variant="outline" onClick={clearDraft} className="border-slate-700 bg-slate-800/60 text-xs text-slate-300 hover:bg-slate-800">
              清空草稿
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-8 md:pt-12">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* 左侧导航 */}
        <div className="hidden lg:block">
          <div className="sticky top-24 space-y-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <button
              onClick={() => setActiveSection('edu')}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                activeSection === 'edu' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <GraduationCap size={18} className={activeSection === 'edu' ? 'text-brand-600' : 'text-slate-400'} />
              教育与背景
            </button>
            <button
              onClick={() => setActiveSection('offer')}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                activeSection === 'offer' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <FileText size={18} className={activeSection === 'offer' ? 'text-brand-600' : 'text-slate-400'} />
              目标 Offer
              <span className="ml-auto text-[10px] font-normal text-slate-400">最多 5 个</span>
            </button>
          </div>
        </div>

        {/* 右侧表单区 */}
        <div className="space-y-8">
          {/* 模块 1:教育与背景 */}
          <Card
            className="overflow-hidden border-slate-200 shadow-sm transition-all hover:shadow-md"
            onMouseEnter={() => setActiveSection('edu')}
          >
            <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  1
                </span>
                教育与背景
              </h2>
              <p className="ml-8 mt-1 text-xs text-slate-500">
                只用于匹配同背景师兄,不会展示给他人。
              </p>
            </div>
            <CardContent className="p-6 md:p-8">
              <BackgroundForm value={background} onChange={setBackground} />
            </CardContent>
          </Card>

          {/* 模块 2:目标 Offer */}
          <Card
            className="overflow-hidden border-slate-200 shadow-sm transition-all hover:shadow-md"
            onMouseEnter={() => setActiveSection('offer')}
          >
            <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  2
                </span>
                您的目标 Offer
              </h2>
              <p className="ml-8 mt-1 text-xs text-slate-500">
                最多可添加 5 个 Offer 进行横向发展对比。
              </p>
            </div>
            <CardContent className="p-6 md:p-8">
              <OfferList value={offers} onChange={setOffers} />
            </CardContent>
          </Card>

          {/* 底部悬浮提交栏 */}
          <div className="sticky bottom-4 z-10 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl md:bottom-8">
            <div className="flex flex-col items-center justify-between gap-4 bg-slate-50 p-4 sm:flex-row sm:px-6">
              <div className="flex-1">
                {!canSubmit ? (
                  <div className="flex items-start gap-2 text-sm text-amber-700">
                    <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500" />
                    <div>
                      <span className="font-semibold">还差 {missing.length} 项才能生成报告:</span>
                      <span className="ml-1 text-amber-600/80">
                        {missing.slice(0, 3).join('、')}
                        {missing.length > 3 ? '…' : ''}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <ShieldCheck size={18} className="text-emerald-500" />
                    数据已就绪。系统将采用 <span className="font-semibold text-slate-800">K-匿名技术</span> 脱敏建模。
                  </div>
                )}
                {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
              </div>
              <Button
                size="lg"
                className={`w-full shrink-0 shadow-md sm:w-auto sm:px-10 ${
                  canSubmit ? 'bg-brand-600 hover:bg-brand-700' : 'bg-slate-300 text-slate-500'
                }`}
                disabled={!canSubmit || submitting}
                onClick={() => setOptinOpen(true)}
              >
                {submitting ? '反推中…' : '生成专业评估报告'}
              </Button>
            </div>
          </div>
        </div>
      </div>
      </div>

      <OptinModal
        open={optinOpen}
        onClose={() => setOptinOpen(false)}
        onConfirm={async (optIn) => {
          if (optIn) {
            await fetch('/api/auth/optin', { method: 'POST' });
          }
          setOptinOpen(false);
          submit();
        }}
      />
    </div>
  );
}
