import { NextResponse } from 'next/server';

import {
  fetchJupiterOtcPriceMarks,
  resolveOtcUsdPerWholeToken,
} from '@/lib/ecosystemJupUsd';

/**
 * SOL/USD + ecosystem token USD for Treasury Transfer Tool (Jupiter v3; v2 fallback for token).
 * USDC leg uses fixed $1 = 1 USDC.
 */
export async function GET() {
  try {
    const marks = await fetchJupiterOtcPriceMarks({ cache: 'no-store' });
    const tokenUsd = resolveOtcUsdPerWholeToken(marks);
    return NextResponse.json({
      ok: true,
      sol_usd: marks.solUsd,
      /** Always 1 — locked USD/token notional; no Jupiter USDC fetch. */
      usdc_usd: marks.usdcUsd,
      /** USD per whole output token: Jupiter when available, else site fallback constant. */
      token_usd: tokenUsd,
      token_usd_from_jupiter: marks.tokenUsd != null,
      fetched_at: marks.fetchedAt,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, detail: e instanceof Error ? e.message : 'price error' },
      { status: 502 },
    );
  }
}
