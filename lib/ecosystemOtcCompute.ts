export type OtcRoundedAmounts = {
  tokensWhole: number;
  usdTotal: number;
  solLamports: bigint;
  usdcMicro: bigint;
};

/** Match ecosystem page: whole tokens up; pay leg ceil lamports / micro-USDC. */
export function computeOtcPayAmounts(
  tokensWhole: number,
  solUsd: number,
  usdcUsd: number,
  /** USD per whole output token (Jupiter mark or agreed fallback). */
  usdPerWholeToken: number,
): OtcRoundedAmounts {
  const tw = Math.max(1, Math.ceil(tokensWhole));
  const usdTotal = tw * usdPerWholeToken;
  const solIdeal = usdTotal / solUsd;
  const usdcIdeal = usdTotal / usdcUsd;
  const solLamports = BigInt(Math.max(1, Math.ceil(solIdeal * 1e9)));
  const usdcMicro = BigInt(Math.max(1, Math.ceil(usdcIdeal * 1e6)));
  return { tokensWhole: tw, usdTotal, solLamports, usdcMicro };
}
