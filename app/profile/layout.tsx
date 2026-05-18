import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '我的 | 学长说',
  description: '我的反推历史、背景档案、会员状态。',
  robots: { index: false, follow: false }, // 个人页不索引
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
