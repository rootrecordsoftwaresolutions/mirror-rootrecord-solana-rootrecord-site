'use client';

import React, { useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { RPC_URL } from '@/lib/solana';

import '@solana/wallet-adapter-react-ui/styles.css';

export function SolanaProviders({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => RPC_URL, []);
  // Note: most modern wallets (Backpack, Glow, etc.) auto-register via the
  // Wallet Standard, so they show up in the modal without an adapter.
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
