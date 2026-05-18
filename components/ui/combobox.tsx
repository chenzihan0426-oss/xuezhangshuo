'use client';
/**
 * 极简 Combobox(typeahead)
 *
 * 行为:
 *   - 聚焦 / 输入 → 弹出下拉列表(loading 时显示 spinner)
 *   - 候选项用 onMouseDown(早于 input.blur)触发 onSelect,避免点击失效
 *   - 已选中时输入框边框变绿 + 右侧打勾;输错重输 → 自动清空选中
 *   - 输入文字恰好等于某候选 label,自动当作"已选中"(便利)
 */
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboItem {
  id: number | string;
  label: string;
  hint?: string;
  [extra: string]: unknown;
}

export interface ComboboxProps {
  placeholder?: string;
  /** 受控输入框文本 */
  value?: string;
  onValueChange?: (v: string) => void;
  /** 当前已选中的 id(用来显示绿色已选状态)*/
  selectedId?: number | string;
  onSelect: (item: ComboItem) => void;
  /** 给 query 返回候选项的函数 */
  fetcher: (query: string) => Promise<ComboItem[]>;
  className?: string;
  emptyHint?: string;
}

export function Combobox({
  placeholder,
  value,
  onValueChange,
  selectedId,
  onSelect,
  fetcher,
  className,
  emptyHint = '没有匹配项',
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ComboItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(value ?? '');
  const wrapRef = useRef<HTMLDivElement>(null);

  // 外部 value 变化 → 同步
  useEffect(() => {
    if (value !== undefined && value !== query) setQuery(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // debounce 取数据
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetcher(query);
        if (!cancelled) setItems(res);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, fetcher]);

  // 当 query 精确等于唯一候选 label,自动认为已选中 ——
  // 解决"用户输了准确的'北京大学',但忘了点列表"的尴尬
  useEffect(() => {
    if (!query.trim()) return;
    if (selectedId !== undefined && selectedId !== 0 && selectedId !== '') return;
    const exact = items.find((it) => it.label === query.trim());
    if (exact) {
      onSelect(exact);
    }
  }, [items, query, selectedId, onSelect]);

  // 点击外部关闭
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const isSelected = selectedId !== undefined && selectedId !== 0 && selectedId !== '';

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <div className="relative">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            onValueChange?.(v);
            setOpen(true);
          }}
          className={cn(
            'flex h-10 w-full rounded-md border bg-background px-3 py-2 pr-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2',
            isSelected
              ? 'border-emerald-500 ring-emerald-200 focus-visible:ring-emerald-300'
              : 'border-input focus-visible:ring-ring',
          )}
        />
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSelected ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* 如果还没选中,提示用户操作 */}
      {!isSelected && query.trim() !== '' && !loading && items.length > 0 && (
        <p className="mt-1 text-[10px] text-amber-600">↑ 从下面列表里点击一项才算选中</p>
      )}

      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {items.length === 0 && !loading && (
            <p className="p-3 text-center text-xs text-muted-foreground">{emptyHint}</p>
          )}
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              // mousedown 在 input.blur 之前;preventDefault 防止 input 失焦后被清掉
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(it);
                setQuery(it.label);
                onValueChange?.(it.label);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                selectedId === it.id && 'bg-emerald-50 text-emerald-900',
              )}
            >
              <span className="truncate">
                {it.label}
                {it.hint && <span className="ml-2 text-xs text-muted-foreground">{String(it.hint)}</span>}
              </span>
              {selectedId === it.id && <Check className="h-4 w-4 text-emerald-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
