import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Launch pool (Raydium CPMM)',
  description:
    'Create a Raydium CPMM pool vs SOL, USDC, or another mint. Same ~0.15 SOL Raydium pool fee as on raydium.io, plus a 0.05 SOL RootRecord service charge (~0.20 SOL fixed before liquidity on mainnet).',
};

export default function LaunchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
