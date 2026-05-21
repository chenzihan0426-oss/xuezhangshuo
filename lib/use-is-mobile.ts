'use client';
import { useEffect, useState } from 'react';

// SSR 安全:服务端默认 false(与桌面 SSR 一致),挂载后按视口订阅更新
export function useIsMobile(maxWidth = 640): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [maxWidth]);
  return isMobile;
}
