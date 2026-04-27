import type { Metadata } from 'next';

import {
  LAUNCH_FEE_SOL,
  RAYDIUM_MAINNET_CPMM_POOL_CREATE_FEE_SOL,
} from '@/lib/solana';

const launchMetaFixed = (
  RAYDIUM_MAINNET_CPMM_POOL_CREATE_FEE_SOL + LAUNCH_FEE_SOL
).toFixed(2);

export const metadata: Metadata = {
  title: 'Launch pool (Raydium CPMM)',
  description: `Create a Raydium CPMM pool vs SOL, USDC, or another mint. On mainnet, total setup is ~${launchMetaFixed} SOL plus liquidity (same as Raydium).`,
};

export default function LaunchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
