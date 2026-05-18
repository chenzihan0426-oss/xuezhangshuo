import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold sm:text-lg">
          <span className="inline-block h-6 w-6 rounded-md bg-gradient-to-br from-brand-500 to-brand-700" />
          学长说
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          <Link href="/input" className="hidden text-muted-foreground hover:text-foreground sm:inline">
            反推
          </Link>
          <Link href="/profile" className="px-2 text-muted-foreground hover:text-foreground">
            我的
          </Link>
          <Button asChild size="sm" variant="outline">
            <Link href="/input">开始反推</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
