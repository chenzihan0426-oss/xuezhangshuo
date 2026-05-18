import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <p className="text-5xl">🤔</p>
      <h1 className="text-2xl font-semibold">这条路径不存在</h1>
      <p className="text-sm text-muted-foreground">链接可能过期了,或者你不是这条数据的主人。</p>
      <Button asChild><Link href="/">回首页</Link></Button>
    </div>
  );
}
