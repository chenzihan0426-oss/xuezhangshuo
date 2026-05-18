/**
 * #1 路径详情弹窗 —— 展开某条师兄的 6 年时间线
 */
'use client';
import { ArrowRight, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { COMPANY_TIER_LABELS, LEVEL_LABELS } from '@/lib/constants';
import { formatSalary } from '@/lib/utils';
import type { PathHistoryEntry, SeniorPath } from '@/lib/types';

const INDUSTRY_LABEL: Record<string, string> = {
  internet: '互联网',
  finance: '金融',
  tech_hardware: '硬件',
  education_training: '教培',
  real_estate: '地产',
  auto_ev: '新能源车',
  telecom: '通信',
  energy: '能源',
  consulting: '咨询',
  startup: '创业',
};

export default function PathDetailModal({
  open,
  onClose,
  path,
}: {
  open: boolean;
  onClose: () => void;
  path: SeniorPath | null;
}) {
  if (!path) return null;

  const history: PathHistoryEntry[] = Array.isArray(path.path_history) ? path.path_history : [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto sm:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>匿名师兄 · {path.start_year} 入职</DialogTitle>
          <DialogDescription>
            {COMPANY_TIER_LABELS[path.first_company_tier ?? 5]} ·{' '}
            {INDUSTRY_LABEL[path.first_industry] ?? path.first_industry} ·{' '}
            {LEVEL_LABELS[path.first_level]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* 概要 */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="5 年后职级" value={LEVEL_LABELS[path.five_year_level ?? 'mid']} />
            <Stat label="5 年后年薪" value={formatSalary(path.five_year_salary)} />
            <Stat label="跳槽 / 换行" value={`${path.job_changes} / ${path.industry_changes}`} />
          </div>

          {/* 时间线 */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 text-xs font-semibold text-muted-foreground">6 年时间线</div>
            <ol className="relative space-y-3 border-l-2 border-brand-200 pl-4">
              {history.length === 0 && (
                <li className="text-sm text-muted-foreground">这位师兄的路径数据缺失中间节点</li>
              )}
              {history.map((h, i) => {
                const prev = history[i - 1];
                const changed =
                  prev && (prev.company_tier !== h.company_tier || prev.industry !== h.industry);
                const promoted = prev && prev.level !== h.level;
                return (
                  <li key={i} className="relative">
                    <div className="absolute -left-[1.4rem] top-1 h-3 w-3 rounded-full border-2 border-brand-500 bg-white" />
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold">{h.year}</span>
                      <Badge variant="outline">{COMPANY_TIER_LABELS[h.company_tier]}</Badge>
                      <Badge variant="outline">{INDUSTRY_LABEL[h.industry] ?? h.industry}</Badge>
                      <Badge variant="secondary">{LEVEL_LABELS[h.level] ?? h.level}</Badge>
                      {changed && (
                        <Badge variant="warning">
                          {prev && prev.industry !== h.industry ? '换行' : '跳槽'}
                        </Badge>
                      )}
                      {promoted && !changed && <Badge variant="success">晋升</Badge>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <p className="text-xs text-muted-foreground">
            * 该路径来自脱敏后的真实样本(k-匿名性 ≥ {path.k_anonymity ?? 1000})。
            学校 / 公司 / 城市等可识别字段已经被聚类匿名化处理。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
