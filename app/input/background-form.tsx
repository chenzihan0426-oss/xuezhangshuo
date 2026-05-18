'use client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox, type ComboItem } from '@/components/ui/combobox';

export interface BackgroundFormState {
  school_id: number;
  school_name?: string;
  school_tier: number;
  major_id: number;
  major_category: string;
  education_level: '本科' | '硕士' | '博士';
  graduation_year: number;
  gpa_band: '<3.0' | '3.0-3.5' | '3.5+' | 'unknown';
  internships: { company_id: number; position_category: string; duration_months: number }[];
}

const MAJOR_CATEGORIES: Array<{ value: string; label: string; default_id: number }> = [
  { value: 'computer_science', label: '计算机 / AI', default_id: 1 },
  { value: 'business', label: '工商管理 / 营销', default_id: 6 },
  { value: 'finance', label: '金融 / 经济', default_id: 11 },
  { value: 'engineering', label: '工科其他', default_id: 14 },
  { value: 'humanities', label: '文科 / 新闻', default_id: 20 },
  { value: 'design', label: '设计', default_id: 24 },
  { value: 'law', label: '法学', default_id: 19 },
  { value: 'medicine', label: '医学', default_id: 25 },
  { value: 'education', label: '教育', default_id: 23 },
];

async function fetchSchools(query: string): Promise<ComboItem[]> {
  const q = query.trim();
  const url = `/api/dict/schools${q ? `?q=${encodeURIComponent(q)}` : ''}`;
  const r = await fetch(url);
  const d = await r.json();
  return (d.items ?? []).map((s: any) => ({
    id: s.id,
    label: s.name,
    hint: `T${s.tier}${s.province ? ' · ' + s.province : ''}`,
    tier: s.tier,
  }));
}

export default function BackgroundForm({
  value,
  onChange,
}: {
  value: BackgroundFormState | null;
  onChange: (v: BackgroundFormState) => void;
}) {
  const v: BackgroundFormState = value ?? {
    school_id: 0,
    school_name: '',
    school_tier: 5,
    major_id: 0,
    major_category: '',
    education_level: '本科',
    graduation_year: 2026,
    gpa_band: 'unknown',
    internships: [],
  };

  function set<K extends keyof BackgroundFormState>(k: K, val: BackgroundFormState[K]) {
    onChange({ ...v, [k]: val });
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-1.5">
        <Label>学校</Label>
        <Combobox
          placeholder="输入学校名搜索(如:清华 / 武大)"
          value={v.school_name ?? ''}
          onValueChange={(s) => set('school_name', s)}
          selectedId={v.school_id || undefined}
          fetcher={fetchSchools}
          onSelect={(it: any) => {
            onChange({
              ...v,
              school_id: it.id as number,
              school_name: it.label,
              school_tier: (it.tier as number) ?? 5,
            });
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label>专业大类</Label>
        <Select
          value={v.major_category || undefined}
          onValueChange={(val) => {
            const m = MAJOR_CATEGORIES.find((x) => x.value === val);
            onChange({ ...v, major_category: val, major_id: m?.default_id ?? 1 });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择专业大类" />
          </SelectTrigger>
          <SelectContent>
            {MAJOR_CATEGORIES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>学历</Label>
        <Select value={v.education_level} onValueChange={(val: any) => set('education_level', val)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="本科">本科</SelectItem>
            <SelectItem value="硕士">硕士</SelectItem>
            <SelectItem value="博士">博士</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="grad_year">毕业年份</Label>
        <Input
          id="grad_year"
          type="number"
          value={v.graduation_year}
          onChange={(e) => set('graduation_year', Number(e.target.value) || 2026)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>GPA</Label>
        <Select value={v.gpa_band} onValueChange={(val: any) => set('gpa_band', val)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3.5+">3.5+</SelectItem>
            <SelectItem value="3.0-3.5">3.0-3.5</SelectItem>
            <SelectItem value="<3.0">&lt;3.0</SelectItem>
            <SelectItem value="unknown">不愿透露</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="internships">实习数量(粗略)</Label>
        <Input
          id="internships"
          type="number"
          min={0}
          max={10}
          value={v.internships.length}
          onChange={(e) => {
            const n = Math.max(0, Math.min(10, Number(e.target.value) || 0));
            const arr: BackgroundFormState['internships'] = Array.from({ length: n }, (_, i) =>
              v.internships[i] ?? { company_id: 0, position_category: '', duration_months: 3 },
            );
            set('internships', arr);
          }}
        />
      </div>
    </div>
  );
}
