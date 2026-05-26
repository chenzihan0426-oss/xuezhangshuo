import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { Header } from '@/components/shared/header';
import { Footer } from '@/components/shared/footer';
import LoginModal from '@/components/shared/login-modal';

export const metadata: Metadata = {
  title: '学长说 | 真实数据 + AI 的职业反推',
  description:
    '用 1000+ 名相似背景师兄师姐 5 年前的真实选择数据,告诉你这个 offer 5 年后大概率会变成什么样。',
  openGraph: {
    title: '学长说 - 数智时代职业引路人',
    description: '同/高/低背景对照 + 环境校正 + 单条真实师兄路径可看可筛',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans">
        <Header />
        <main className="w-full py-6">{children}</main>
        <Footer />
        <Suspense fallback={null}>
          <LoginModal />
        </Suspense>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
