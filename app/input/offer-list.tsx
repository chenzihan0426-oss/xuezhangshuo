'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox, type ComboItem } from '@/components/ui/combobox';
import { X } from 'lucide-react';

export interface OfferRow {
  /** 0 表示字典外,用户手填 */
  company_id: number;
  company_name: string;
  /** 1=大厂 / 2=独角兽 / 3=普通互联网 / 4=传统企业 / 5=国企 / 6=政府 / 7=创业 */
  company_tier?: number;
  /** 该公司行业(字典内自动从 dict 带回填,字典外用户必选) */
  first_industry?: string;
  /** 匹配 key,必须是预定义类目 */
  position_category: string;
  /** 用户输入的具体岗位名,不影响匹配 */
  position_name?: string;
  level: 'intern' | 'graduate' | 'junior' | 'mid' | 'senior' | 'lead';
  salary_min?: number;
  salary_max?: number;
  location?: string;
}

const INDUSTRY_OPTIONS: Array<[string, string]> = [
  ['internet', '互联网'],
  ['tech_hardware', '硬件 / 芯片'],
  ['finance', '金融 / 投行'],
  ['auto_ev', '新能源车'],
  ['consulting', '咨询'],
  ['consumer_service', '消费服务 / 餐饮 / 连锁零售'],
  ['education_training', '教培 / 教育'],
  ['real_estate', '地产'],
  ['telecom', '通信'],
  ['energy', '能源'],
  ['startup', '创业 / 早期项目'],
  ['other', '其他(不在以上行业)'],
];

const POSITIONS: Array<[string, string]> = [
  ['engineer_backend', '后端开发'],
  ['engineer_frontend', '前端开发'],
  ['engineer_algorithm', '算法'],
  ['engineer_data', '数据工程'],
  ['product_manager', '产品经理'],
  ['ui_designer', 'UI 设计'],
  ['content_operation', '内容运营'],
  ['user_operation', '用户运营'],
  ['marketing', '市场营销'],
  ['sales_b2b', 'B2B 销售'],
  ['sales_b2c', 'B2C 销售'],
  ['data_analyst', '数据分析'],
  ['finance_analyst', '财务分析'],
  ['investment_analyst', '投资分析'],
  ['consultant', '咨询顾问'],
  ['hr', '人力资源'],
  ['teacher_k12', 'K12 教师'],
  ['civil_servant', '公务员'],
];

const COMPANY_TIER_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: '一线大厂(如 字节/阿里/腾讯)' },
  { value: 2, label: '独角兽 / 二线互联网' },
  { value: 3, label: '普通互联网公司' },
  { value: 4, label: '传统企业 / 房地产 / 教培' },
  { value: 5, label: '国企 / 银行' },
  { value: 6, label: '政府 / 事业单位' },
  { value: 7, label: '创业公司 / 初创' },
];

async function fetchCompanies(query: string): Promise<ComboItem[]> {
  const q = query.trim();
  const url = `/api/dict/companies${q ? `?q=${encodeURIComponent(q)}` : ''}`;
  const r = await fetch(url);
  const d = await r.json();
  return (d.items ?? []).map((c: any) => ({
    id: c.id,
    label: c.name,
    hint: `T${c.tier}${c.industry ? ' · ' + c.industry : ''}`,
    tier: c.tier,
    industry: c.industry,
  }));
}

export default function OfferList({
  value,
  onChange,
}: {
  value: OfferRow[];
  onChange: (v: OfferRow[]) => void;
}) {
  function add() {
    if (value.length >= 5) return;
    onChange([
      ...value,
      { company_id: 0, company_name: '', position_category: '', level: 'graduate' },
    ]);
  }

  function update(i: number, patch: Partial<OfferRow>) {
    onChange(value.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-4">
      {value.length === 0 && (
        <p className="text-sm text-muted-foreground">还没有 offer,点击下方按钮添加第一个。</p>
      )}

      {value.map((o, i) => {
        const isCustomCompany = !o.company_id && !!o.company_name;
        return (
          <div key={i} className="grid grid-cols-1 gap-3 rounded-lg border p-4 md:grid-cols-6">
            <div className="md:col-span-3">
              <Label>
                公司
                {isCustomCompany && (
                  <span className="ml-2 text-xs text-amber-600">(字典外公司,请选公司类型 →)</span>
                )}
              </Label>
              <Combobox
                placeholder="输入公司全称(没在列表也可,如:某不知名创业公司)"
                value={o.company_name}
                onValueChange={(s) => {
                  // 用户自由输入时,若文本已不再等于已绑定字典公司的名字,
                  // 必须清空 company_id / first_industry,否则会沿用上一个公司的字典 id
                  // 导致 fetchCandidates 错误命中(典型 bug:输入"星巴克"但 company_id 仍是阿里)
                  const stillSameDictPick = o.company_id && o.company_name === s;
                  if (stillSameDictPick) {
                    update(i, { company_name: s });
                  } else {
                    update(i, {
                      company_name: s,
                      company_id: 0,
                      first_industry: undefined,
                    });
                  }
                }}
                selectedId={o.company_id || undefined}
                fetcher={fetchCompanies}
                emptyHint="字典里没有,直接用你输入的名字即可"
                onSelect={(it: any) =>
                  update(i, {
                    company_id: it.id as number,
                    company_name: it.label,
                    company_tier: (it.tier as number) ?? o.company_tier,
                    first_industry: (it.industry as string) ?? o.first_industry,
                  })
                }
              />
            </div>

            <div className="md:col-span-2">
              <Label>公司类型(用于匹配)</Label>
              <Select
                value={o.company_tier ? String(o.company_tier) : ''}
                onValueChange={(val) => update(i, { company_tier: Number(val) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选公司类型" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_TIER_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={String(t.value)}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end justify-end md:col-span-1">
              <Button variant="ghost" size="icon" onClick={() => remove(i)} aria-label="删除">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="md:col-span-2">
              <Label>
                行业(用于匹配)
                {isCustomCompany && <span className="ml-1 text-xs text-amber-600">必选</span>}
              </Label>
              <Select
                value={o.first_industry ?? ''}
                onValueChange={(val) => update(i, { first_industry: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选行业" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label>岗位大类(用于匹配)</Label>
              <Select
                value={o.position_category || ''}
                onValueChange={(val) => update(i, { position_category: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择岗位大类" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label>具体岗位(可选)</Label>
              <Input
                placeholder="如:高级后端工程师 / 国际市场销售"
                value={o.position_name ?? ''}
                onChange={(e) => update(i, { position_name: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <Label>职级</Label>
              <Select value={o.level} onValueChange={(val: any) => update(i, { level: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="intern">实习</SelectItem>
                  <SelectItem value="graduate">应届</SelectItem>
                  <SelectItem value="junior">初级</SelectItem>
                  <SelectItem value="mid">中级</SelectItem>
                  <SelectItem value="senior">高级</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label>年薪下限(元)</Label>
              <Input
                type="number"
                value={o.salary_min ?? ''}
                onChange={(e) =>
                  update(i, { salary_min: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label>年薪上限(元)</Label>
              <Input
                type="number"
                value={o.salary_max ?? ''}
                onChange={(e) =>
                  update(i, { salary_max: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label>城市</Label>
              <Input
                value={o.location ?? ''}
                placeholder="北京 / 上海 / 杭州..."
                onChange={(e) => update(i, { location: e.target.value })}
              />
            </div>
          </div>
        );
      })}

      {value.length < 5 && (
        <Button variant="outline" onClick={add}>+ 添加一个 offer</Button>
      )}
    </div>
  );
}
