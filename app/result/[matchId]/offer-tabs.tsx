'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface HistoryItem {
  id: string;
  status: string;
}

export default function OfferTabs({ activeMatchId }: { activeMatchId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    fetch('/api/user/history')
      .then((r) => r.json())
      .then((d) => setItems((d.items ?? []).slice(0, 5)));
  }, []);

  if (items.length <= 1) return null;
  return (
    <Tabs
      value={activeMatchId}
      onValueChange={(v) => router.push(`/result/${v}`)}
      className="mt-3"
    >
      <TabsList>
        {items.map((it, i) => (
          <TabsTrigger key={it.id} value={it.id}>
            Offer {items.length - i}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
