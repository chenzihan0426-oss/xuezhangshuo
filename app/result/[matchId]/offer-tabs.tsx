'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BatchItem {
  id: string;
  company_name: string;
  position_category: string;
}

export default function OfferTabs({ activeMatchId }: { activeMatchId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<BatchItem[]>([]);

  useEffect(() => {
    fetch(`/api/match/${activeMatchId}/batch`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []));
  }, [activeMatchId]);

  // 本次提交只有 1 个 offer 时不显示 tabs
  if (items.length <= 1) return null;
  return (
    <Tabs
      value={activeMatchId}
      onValueChange={(v) => router.push(`/result/${v}`)}
      className="mt-3"
    >
      <TabsList>
        {items.map((it) => (
          <TabsTrigger key={it.id} value={it.id}>
            {it.company_name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
