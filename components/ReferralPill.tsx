'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { captureReferrerFromUrl } from '@/lib/referral';
import { shortAddr } from '@/lib/utils';

export function ReferralPill() {
  const [ref, setRef] = useState<string | null>(null);
  useEffect(() => {
    setRef(captureReferrerFromUrl());
  }, []);
  if (!ref) return null;
  return (
    <div
      data-testid="referral-pill"
      title={`Referred by ${ref}`}
      className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-sol-purple/40 bg-sol-purple/10 px-3 py-1 text-xs text-sol-purple"
    >
      <Users className="h-3 w-3" />
      Referred by <span className="font-mono">{shortAddr(ref, 4)}</span>
    </div>
  );
}
