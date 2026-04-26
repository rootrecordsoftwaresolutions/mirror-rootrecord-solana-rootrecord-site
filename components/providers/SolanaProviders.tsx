'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { WalletAdapter } from '@solana/wallet-adapter-base';
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
  // Wallet adapter constructors touch browser APIs; build only on the client
  // so static prerender / Vercel "Export" does not throw in Node.
  const [wallets, setWallets] = useState<WalletAdapter[]>([]);
  useEffect(() => {
    setWallets([new PhantomWalletAdapter(), new SolflareWalletAdapter()]);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
