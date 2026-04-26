import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bulk SOL & token sends',
  description:
    'Send SOL or SPL tokens to many wallets in batched transactions. RootRecord fee scales with list size; you pay Solana network fees and token-account rent when needed.',
};

export default function BulkLayout({ children }: { children: React.ReactNode }) {
  return children;
}
