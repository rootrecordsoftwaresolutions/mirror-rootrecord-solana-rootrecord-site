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
  description: `Create a Raydium CPMM pool vs SOL, USDC, or another mint. Raydium’s ~${RAYDIUM_MAINNET_CPMM_POOL_CREATE_FEE_SOL} SOL on-chain total matches raydium.io; RootRecord adds a ${LAUNCH_FEE_SOL} SOL launcher fee (~${launchMetaFixed} SOL fixed before liquidity on mainnet).`,
};

export default function LaunchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
