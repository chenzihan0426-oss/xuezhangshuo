import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '反推我的 offer | 学长说',
  description:
    '填写背景 + offer,1000+ 名相似背景师兄师姐的 5 年真实路径会立刻呈现,带「环境校正」。',
  openGraph: {
    title: '学长说 - 反推 5 年后',
    description: '用真实数据告诉你这个 offer 5 年后会变成什么样',
  },
};

export default function InputLayout({ children }: { children: React.ReactNode }) {
  return children;
}
