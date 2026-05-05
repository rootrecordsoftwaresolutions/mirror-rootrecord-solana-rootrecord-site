import { NextResponse } from 'next/server';

import {
  isPresaleCheckoutActive,
  presaleMaxUsd,
  presaleMinUsd,
} from '@/lib/presaleCheckout';
import { ECOSYSTEM_OTC_TOKEN_MINT, ECOSYSTEM_LISTING_SYMBOL } from '@/lib/ecosystemOtcConstants';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true as const,
    active: isPresaleCheckoutActive(),
    symbol: ECOSYSTEM_LISTING_SYMBOL,
    mint: ECOSYSTEM_OTC_TOKEN_MINT.trim(),
    min_usd: presaleMinUsd(),
    max_usd: presaleMaxUsd(),
  });
}
