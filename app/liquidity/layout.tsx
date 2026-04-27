import type { Metadata } from 'next';

import {
  LAUNCH_FEE_SOL,
  RAYDIUM_MAINNET_CPMM_POOL_CREATE_FEE_SOL,
} from '@/lib/solana';

const launchMetaFixed = (
  RAYDIUM_MAINNET_CPMM_POOL_CREATE_FEE_SOL + LAUNCH_FEE_SOL
).toFixed(2);

export const metadata: Metadata = {
  title: 'Liquidity (Raydium CPMM)',
  description: `Create a Raydium CPMM pool, add liquidity, or remove liquidity (burn LP). On mainnet, new pool setup is ~${launchMetaFixed} SOL plus liquidity (same as Raydium).`,
};

export default function LiquidityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
