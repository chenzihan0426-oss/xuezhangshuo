/**
 * M2 录入页
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BackgroundForm, { type BackgroundFormState } from './background-form';
import OfferList, { type OfferRow } from './offer-list';
import OptinModal from './optin-modal';

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

  // 草稿恢复 / 持久化(只在首次加载时恢复)
  useEffect(() => {
    try {
      OLD_KEYS.forEach((k) => localStorage.removeItem(k));
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.background) setBackground(draft.background);
        if (draft.offers) setOffers(draft.offers);
      }
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
    if (!background?.school_id) out.push('学校(请从下拉列表里点选)');
    if (!background?.major_category) out.push('专业大类');
    if (offers.length === 0) out.push('至少 1 个 offer');
    offers.forEach((o, i) => {
      if (!o.company_id) out.push(`Offer ${i + 1}:公司(请从下拉列表里点选)`);
      if (!o.position_category) out.push(`Offer ${i + 1}:岗位`);
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
      // 确保 major_id 有合理默认(老数据兜底)
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
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>你的背景</CardTitle>
              <CardDescription>
                只用于匹配同背景师兄,不会展示给他人。所有字段都可后续在「我的」修改。
              </CardDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={clearDraft} className="text-xs">
              清空草稿
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <BackgroundForm value={background} onChange={setBackground} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>你的 offer(最多 5 个)</CardTitle>
          <CardDescription>每个 offer 会独立反推一组结果,可以横向对比。</CardDescription>
        </CardHeader>
        <CardContent>
          <OfferList value={offers} onChange={setOffers} />
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-3">
        <Button size="xl" disabled={!canSubmit || submitting} onClick={() => setOptinOpen(true)}>
          {submitting ? '反推中…' : '开始反推 →'}
        </Button>

        {/* 缺什么的提示 */}
        {!canSubmit && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <p className="font-semibold">还差 {missing.length} 项才能提交:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {missing.slice(0, 5).map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">
          提交即视为同意我们对你的数据进行 <strong>脱敏建模</strong>(不会公开任何可识别字段)。
        </p>
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
