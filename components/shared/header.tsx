'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Briefcase } from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  const isDarkHome = pathname === '/';

  if (isDarkHome) {
    return (
      <header className="absolute inset-x-0 top-0 z-30 w-full">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-6">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-white shadow-lg shadow-brand-500/30">
              <Briefcase size={14} />
            </span>
            学长说
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <Link href="/input" className="transition hover:text-white">Offer 评估</Link>
            <Link href="/input" className="transition hover:text-white">岗位洞察</Link>
            <Link href="/profile" className="transition hover:text-white">职业档案</Link>
          </nav>
          <nav className="flex items-center gap-2 text-sm sm:gap-3">
            <Link href="/profile?login=1" className="hidden text-slate-300 transition hover:text-white sm:inline">
              登录 / 注册
            </Link>
            <Button asChild size="sm" className="bg-white text-slate-900 shadow-sm hover:bg-slate-100">
              <Link href="/profile">我的报告</Link>
            </Button>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-6">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold sm:text-lg">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-white">
            <Briefcase size={12} />
          </span>
          学长说
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          <Link href="/input" className="hidden text-muted-foreground hover:text-foreground sm:inline">
            Offer 评估
          </Link>
          <Link href="/profile" className="px-2 text-muted-foreground hover:text-foreground">
            我的报告
          </Link>
          <Button asChild size="sm" className="bg-brand-600 hover:bg-brand-700">
            <Link href="/input">开始评估</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
