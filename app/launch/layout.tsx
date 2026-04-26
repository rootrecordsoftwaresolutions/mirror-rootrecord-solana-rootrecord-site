import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Launch pool (Raydium CPMM)',
  description:
    'Create a Raydium constant-product pool for your token vs SOL and seed initial liquidity in one flow — without opening raydium.io.',
};

export default function LaunchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
