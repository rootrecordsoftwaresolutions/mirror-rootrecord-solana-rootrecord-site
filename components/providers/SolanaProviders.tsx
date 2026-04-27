'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Adapter, WalletAdapter, WalletError } from '@solana/wallet-adapter-base';
import { WalletNotReadyError } from '@solana/wallet-adapter-base';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { JupiterWalletAdapter, JupiterWalletName } from '@/lib/jupiterWalletAdapter';
import { RPC_URL } from '@/lib/solana';

import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * Default wallet-adapter behavior opens `adapter.url` on WalletNotReadyError (install flow).
 * Jupiter's URL is jup.ag; with Jupiter first in the list or saved in localStorage, a single
 * "Connect" click felt like the site was redirecting away. Phantom / Solflare still open their pages.
 */
function walletErrorHandler(error: WalletError, adapter?: Adapter) {
  console.error('Wallet error', error, adapter?.name);
  if (
    error instanceof WalletNotReadyError &&
    adapter &&
    typeof window !== 'undefined' &&
    adapter.name !== JupiterWalletName
  ) {
    window.open(adapter.url, '_blank');
  }
}

export function SolanaProviders({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => RPC_URL, []);
  const onWalletError = useCallback(walletErrorHandler, []);
  // Wallet adapter constructors touch browser APIs; build only on the client
  // so static prerender / Vercel "Export" does not throw in Node.
  const [wallets, setWallets] = useState<WalletAdapter[]>([]);
  useEffect(() => {
    setWallets([
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new JupiterWalletAdapter(),
    ]);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect onError={onWalletError}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
