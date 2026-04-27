import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Actions',
  description:
    'Sign in with your Solana wallet to view on-chain actions you performed through RootRecord Solana Tools.',
};

export default function MyActionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
