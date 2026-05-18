'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 flex justify-end gap-2">{children}</div>;
}

export default function OptinModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (optIn: boolean) => void;
}) {
  const [optIn, setOptIn] = useState(true);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>把你的数据也加入样本池?</DialogTitle>
          <DialogDescription>
            如果你愿意,我们会在 5 年后(2031),把你的真实选择脱敏后加入样本池,
            帮助下一届学弟学妹做同样的反推。任何时候都可以在「我的」撤销。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <label className="flex items-start gap-2">
            <input type="radio" checked={optIn} onChange={() => setOptIn(true)} />
            <span>
              <strong>愿意</strong>(默认):我贡献我的轨迹,也享受别人的轨迹
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" checked={!optIn} onChange={() => setOptIn(false)} />
            <span>暂不,只使用现有样本反推</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>取消</Button>
          <Button onClick={() => onConfirm(optIn)}>确定并反推</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
