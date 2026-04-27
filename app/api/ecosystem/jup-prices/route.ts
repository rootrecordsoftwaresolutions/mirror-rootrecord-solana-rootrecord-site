import { NextResponse } from 'next/server';

import { fetchJupiterSolUsdcUsd } from '@/lib/ecosystemJupUsd';

/**
 * Cached SOL / USDC USD reference for OTC calculator (Jupiter Price API v2).
 */
export async function GET() {
  try {
    const { solUsd, usdcUsd, fetchedAt } = await fetchJupiterSolUsdcUsd();
    return NextResponse.json({
      ok: true,
      sol_usd: solUsd,
      usdc_usd: usdcUsd,
      fetched_at: fetchedAt,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, detail: e instanceof Error ? e.message : 'price error' },
      { status: 502 },
    );
  }
}
