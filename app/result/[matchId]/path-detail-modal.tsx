/**
 * #1 路径详情弹窗 —— 展开某条师兄的 6 年时间线
 *
 * 时间线渲染:每年显示「公司 · 岗位 · 职级 · 薪资」+ 跳槽/换行/晋升 标签
 * 如果数据缺 company_name(老数据没补全),回退到 tier 标签
 */
'use client';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { COMPANY_TIER_LABELS, LEVEL_LABELS, SCHOOL_TIER_LABELS, schoolNameFor } from '@/lib/constants';
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
  salaryScale = 1,
}: {
  open: boolean;
  onClose: () => void;
  path: SeniorPath | null;
  salaryScale?: number;
}) {
  if (!path) return null;
  const scaleSalary = (s: number | undefined | null) =>
    s ? Math.round(s * salaryScale) : s;

  const history: PathHistoryEntry[] = Array.isArray(path.path_history) ? path.path_history : [];
  const firstCompanyName = history[0]?.company_name;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto sm:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            匿名师兄 · {path.start_year} 入职
            {firstCompanyName && (
              <span className="ml-2 text-base font-normal text-brand-600">{firstCompanyName}</span>
            )}
          </DialogTitle>
          <DialogDescription>
            {COMPANY_TIER_LABELS[path.first_company_tier ?? 5]} ·{' '}
            {INDUSTRY_LABEL[path.first_industry] ?? path.first_industry} ·{' '}
            {LEVEL_LABELS[path.first_level]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* 师兄背景:毕业院校层级 + 学历 */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">毕业背景:</span>
            {path.school_tier && (
              <Badge variant="outline">
                {schoolNameFor(path.id, path.school_tier)}
                <span className="ml-1 opacity-60">{SCHOOL_TIER_LABELS[path.school_tier]}</span>
              </Badge>
            )}
            {path.education_level && <Badge variant="outline">{path.education_level}</Badge>}
          </div>

          {/* 概要 */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="5 年后职级" value={LEVEL_LABELS[path.five_year_level ?? 'mid']} />
            <Stat label="5 年后年薪" value={formatSalary(scaleSalary(path.five_year_salary))} />
            <Stat label="跳槽 / 换行" value={`${path.job_changes} / ${path.industry_changes}`} />
          </div>

          {/* 时间线 */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-3 text-xs font-semibold text-muted-foreground">6 年时间线</div>
            <ol className="relative space-y-4 border-l-2 border-brand-200 pl-4">
              {history.length === 0 && (
                <li className="text-sm text-muted-foreground">这位师兄的路径数据缺失中间节点</li>
              )}
              {history.map((h, i) => {
                const prev = history[i - 1];
                const companyChanged = prev && prev.company_name && h.company_name && prev.company_name !== h.company_name;
                const tierChanged = prev && prev.company_tier !== h.company_tier;
                const industryChanged = prev && prev.industry !== h.industry;
                const jumped = companyChanged || tierChanged || industryChanged;
                const promoted = prev && prev.level !== h.level;

                return (
                  <li key={i} className="relative">
                    <div className="absolute -left-[1.4rem] top-1.5 h-3 w-3 rounded-full border-2 border-brand-500 bg-white" />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-sm font-semibold">{h.year} 年</span>
                        <span className="text-base font-bold text-foreground">
                          {h.company_name ?? COMPANY_TIER_LABELS[h.company_tier]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({COMPANY_TIER_LABELS[h.company_tier]} · {INDUSTRY_LABEL[h.industry] ?? h.industry})
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="secondary">{h.position_name ?? h.position}</Badge>
                        <Badge variant="outline">{LEVEL_LABELS[h.level] ?? h.level}</Badge>
                        {h.salary !== undefined && (
                          <span className="text-muted-foreground">· {formatSalary(scaleSalary(h.salary))}</span>
                        )}
                        {jumped && (
                          <Badge variant="warning">
                            {industryChanged ? '换行' : '跳槽'}
                          </Badge>
                        )}
                        {promoted && !jumped && <Badge variant="success">晋升</Badge>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <p className="rounded-md bg-amber-50 p-3 text-[11px] text-amber-900">
            📝 <strong>V1 演示数据说明</strong>:这条路径基于公开就业报告分布合成,
            公司名是从同 tier、同行业的常见公司里随机示例(并不代表某位特定师兄的真实公司)。
            k-匿名性 ≥ {path.k_anonymity ?? 1000},任何字段都不能反向定位到具体个人。
            正式版会接入智联真实合作数据(脱敏后的真实样本)。
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
