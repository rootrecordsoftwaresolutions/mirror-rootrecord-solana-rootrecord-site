import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Token stats',
  description:
    'Open a shareable dashboard for any SPL mint: supply, authorities, top token accounts, Jupiter price, and Metaplex metadata.',
};

export default function TokenStatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
