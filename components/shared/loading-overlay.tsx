'use client';
import { Loader2 } from 'lucide-react';

export function LoadingOverlay({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p>{text ?? '计算中...'}</p>
    </div>
  );
}
