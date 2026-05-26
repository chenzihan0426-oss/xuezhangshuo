'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Briefcase, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PREFILL_KEY = 'xuezhangshuo:home-prefill';

export default function HomeInlineForm() {
  const router = useRouter();
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function submit() {
    setSubmitting(true);
    try {
      const payload = {
        company_name: company.trim(),
        position_keyword: position.trim(),
        ts: Date.now(),
      };
      localStorage.setItem(PREFILL_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
    router.push('/input');
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/30">
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="公司名称(如:腾讯)"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="h-14 w-full rounded-xl border border-transparent bg-slate-50/60 pl-11 pr-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400/20"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </div>
        <div className="relative">
          <Briefcase className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="目标岗位(如:产品经理)"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="h-14 w-full rounded-xl border border-transparent bg-slate-50/60 pl-11 pr-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400/20"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </div>
        <Button
          className="h-14 rounded-xl bg-brand-600 px-8 text-base font-semibold shadow-md shadow-brand-500/30 transition hover:bg-brand-700 disabled:opacity-60"
          onClick={submit}
          disabled={submitting}
        >
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          生成评估报告
          {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
