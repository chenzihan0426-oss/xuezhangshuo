'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';

export default function ShareCard({ matchId }: { matchId: string }) {
  const [copied, setCopied] = useState(false);

  async function copyShareLink() {
    const url = `${window.location.origin}/share/${matchId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button size="sm" variant="outline" onClick={copyShareLink}>
      <Share2 className="mr-1 h-4 w-4" /> {copied ? '已复制' : '分享'}
    </Button>
  );
}
