import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '支付 | 学长说',
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
