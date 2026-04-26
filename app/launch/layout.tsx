import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Launch pool (Raydium CPMM)',
  description:
    'Create a Raydium constant-product pool for your token vs SOL, USDC, or another mint and seed liquidity — with an optional RootRecord launch fee.',
};

export default function LaunchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
