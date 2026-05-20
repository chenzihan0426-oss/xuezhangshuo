/**
 * 匹配诚实声明横幅。
 *
 * 当系统找不到「用户填的这家公司」本身的师兄数据(match_level 是降级档)时,
 * 显眼地告诉用户:没找到这家公司的数据,以下是相似公司的路径,供参考。
 * 找到了本公司数据(exact / same_company)时不显示。
 */
'use client';

export type MatchLevel =
  | 'exact_company_position'
  | 'same_company_any_position'
  | 'same_tier_industry_position'
  | 'same_tier_position'
  | 'position_only';

export default function MatchLevelBanner({
  companyName,
  matchLevel,
  sampleSize,
}: {
  companyName?: string;
  matchLevel?: MatchLevel;
  sampleSize?: number;
}) {
  // 有本公司数据,不需要声明
  if (!matchLevel || matchLevel === 'exact_company_position' || matchLevel === 'same_company_any_position') {
    return null;
  }

  const name = companyName?.trim() || '这家公司';
  const fallbackDesc: Record<Exclude<MatchLevel, 'exact_company_position' | 'same_company_any_position'>, string> = {
    same_tier_industry_position: '同档次 + 同行业 + 同岗位',
    same_tier_position: '同档次公司、同岗位(行业可能不同)',
    position_only: '相同岗位(档次 / 行业可能不同)',
  };
  const desc = fallbackDesc[matchLevel as keyof typeof fallbackDesc];
  const lowConfidence = matchLevel === 'position_only' || (sampleSize ?? 0) < 5;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
      <div className="flex items-start gap-2">
        <span className="text-base leading-none">🔍</span>
        <div className="space-y-1">
          <p className="font-semibold text-amber-900">
            没有找到「{name}」历届师兄的直接数据
          </p>
          <p className="text-amber-800">
            我们的数据库里暂时没有收录这家公司的师兄路径。下面展示的是
            <span className="font-semibold">【{desc}】</span>
            的师兄近 5 年的真实职业路径,作为相似参考
            {sampleSize !== undefined ? `(共 ${sampleSize} 位)` : ''}。
          </p>
          {lowConfidence && (
            <p className="text-xs text-amber-700">
              ⚠️ 当前样本较少,结论仅供粗略参考,建议结合自身判断。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
