import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contracts',
  description:
    'Design vesting schedules, time locks, and token custody deals on Solana — linear cliffs, tranches, treasuries, and multi-recipient releases.',
};

export default function ContractsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
