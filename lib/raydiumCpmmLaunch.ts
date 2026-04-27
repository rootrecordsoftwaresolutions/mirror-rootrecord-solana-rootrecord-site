import BN from 'bn.js';
import {
  CREATE_CPMM_POOL_FEE_ACC,
  CREATE_CPMM_POOL_PROGRAM,
  DEVNET_PROGRAM_ID,
  Raydium,
  TxVersion,
  getCpmmPdaAmmConfigId,
} from '@raydium-io/raydium-sdk-v2';
import { getMint, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type {
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
} from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';

import { decimalStringToRawAmount } from '@/lib/bulkSol';
import { appendReferralMemoIfEligible } from '@/lib/referralMemo';
import {
  getConnection,
  resolveMintAndProgram,
  SOLANA_NETWORK,
  explorerUrl,
  feeTransferIx,
  sendSimpleTx,
  LAUNCH_FEE_SOL,
} from '@/lib/solana';

const WSOL_MINT = 'So11111111111111111111111111111111111111112';

/** Mainnet USDC (legacy SPL). */
const MAINNET_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
/** Common devnet USDC mint when no deployment-specific USDC mint is set. */
const DEVNET_USDC_DEFAULT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEGERXfW9vpM8Xo';

export type CpmmMintPick = {
  address: string;
  decimals: number;
  programId: string;
};

export type LaunchQuoteKind = 'wsol' | 'usdc' | 'custom';

function toRaydiumCluster(): 'mainnet' | 'devnet' {
  return SOLANA_NETWORK === 'devnet' ? 'devnet' : 'mainnet';
}

function wrapSignAllTransactions(wallet: WalletContextState) {
  if (wallet.signAllTransactions) {
    return wallet.signAllTransactions.bind(wallet) as <
      T extends Transaction | VersionedTransaction,
    >(
      txs: T[],
    ) => Promise<T[]>;
  }
  if (!wallet.signTransaction) return undefined;
  return async <T extends Transaction | VersionedTransaction>(
    txs: T[],
  ): Promise<T[]> => {
    const out: T[] = [];
    for (const tx of txs) {
      out.push(
        (await wallet.signTransaction!(
          tx as Parameters<NonNullable<WalletContextState['signTransaction']>>[0],
        )) as T,
      );
    }
    return out;
  };
}

async function mintToCpmmPick(mintAddress: string): Promise<CpmmMintPick> {
  const { mint, programId } = await resolveMintAndProgram(mintAddress);
  const mintInfo = await getMint(
    getConnection(),
    mint,
    undefined,
    programId,
  );
  return {
    address: mint.toBase58(),
    decimals: mintInfo.decimals,
    programId: programId.toBase58(),
  };
}

function wsolPick(): CpmmMintPick {
  return {
    address: WSOL_MINT,
    decimals: 9,
    programId: TOKEN_PROGRAM_ID.toBase58(),
  };
}

function configuredUsdcMint(): string {
  const trimmed = process.env.NEXT_PUBLIC_LAUNCH_USDC_MINT?.trim();
  if (trimmed) return trimmed;
  return SOLANA_NETWORK === 'devnet' ? DEVNET_USDC_DEFAULT : MAINNET_USDC;
}

async function quotePickForKind(
  kind: LaunchQuoteKind,
  customMint?: string,
): Promise<CpmmMintPick> {
  if (kind === 'wsol') return wsolPick();
  if (kind === 'usdc') return mintToCpmmPick(configuredUsdcMint());
  const m = customMint?.trim();
  if (!m) throw new Error('Enter the quote token mint for “Other token”');
  return mintToCpmmPick(m);
}

/** Raydium CPMM requires mint A < mint B lexicographically; amounts follow that order. */
function orderCpmmPair(
  mintX: CpmmMintPick,
  amountX: BN,
  mintY: CpmmMintPick,
  amountY: BN,
): [CpmmMintPick, CpmmMintPick, BN, BN] {
  const cmp = mintX.address.localeCompare(mintY.address);
  if (cmp < 0) return [mintX, mintY, amountX, amountY];
  if (cmp > 0) return [mintY, mintX, amountY, amountX];
  throw new Error('Cannot create a pool between a mint and itself');
}

async function sendLaunchPlatformFee(
  wallet: WalletContextState,
  referrer: string | null | undefined,
): Promise<string | null> {
  if (!wallet.publicKey || LAUNCH_FEE_SOL <= 0) return null;
  const feeIx = feeTransferIx(wallet.publicKey, LAUNCH_FEE_SOL);
  const ixs: TransactionInstruction[] = [];
  if (feeIx) ixs.push(feeIx);
  appendReferralMemoIfEligible(ixs, wallet.publicKey, referrer ?? null);
  if (!ixs.length) return null;
  return sendSimpleTx(wallet, ixs);
}

/**
 * Create a Raydium CPMM pool: your base mint vs SOL, USDC, or another SPL / Token-2022 mint.
 * Optionally sends a prior legacy tx for the RootRecord launch fee + referral memo.
 */
export async function createCpmmPoolWithQuote(
  wallet: WalletContextState,
  params: {
    baseMint: string;
    tokenAmount: string;
    quoteKind: LaunchQuoteKind;
    /** Required when `quoteKind` is `custom`. */
    quoteMint?: string;
    /** Human amount for the quote side (quote mint decimals). */
    quoteAmount: string;
    referrer?: string | null;
  },
): Promise<{ feeTxId: string | null; poolTxId: string; poolId: string }> {
  if (!wallet.publicKey) {
    throw new Error('Connect your wallet first');
  }
  const signAll = wrapSignAllTransactions(wallet);
  if (!signAll) {
    throw new Error('Wallet must support signing transactions');
  }

  const feeTxId = await sendLaunchPlatformFee(wallet, params.referrer);

  const connection = getConnection();
  const cluster = toRaydiumCluster();

  const raydium = await Raydium.load({
    connection,
    cluster,
    owner: wallet.publicKey,
    signAllTransactions: signAll,
    disableLoadToken: true,
  });

  const base = await mintToCpmmPick(params.baseMint.trim());
  const quote = await quotePickForKind(params.quoteKind, params.quoteMint);

  const rawBase = decimalStringToRawAmount(
    params.tokenAmount.trim(),
    base.decimals,
  );
  const rawQuote = decimalStringToRawAmount(
    params.quoteAmount.trim(),
    quote.decimals,
  );

  const bnBase = new BN(rawBase.toString());
  const bnQuote = new BN(rawQuote.toString());

  const [mintA, mintB, mintAAmount, mintBAmount] = orderCpmmPair(
    base,
    bnBase,
    quote,
    bnQuote,
  );

  const useSolBalance =
    mintA.address === WSOL_MINT || mintB.address === WSOL_MINT;

  let feeConfigs = await raydium.api.getCpmmConfigs();
  if (cluster === 'devnet') {
    feeConfigs = feeConfigs.map((config) => ({
      ...config,
      id: getCpmmPdaAmmConfigId(
        DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
        config.index,
      ).publicKey.toBase58(),
    }));
  }
  if (!feeConfigs.length) {
    throw new Error('No CPMM fee configs returned from Raydium API');
  }

  const programId =
    cluster === 'devnet'
      ? DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM
      : CREATE_CPMM_POOL_PROGRAM;
  const poolFeeAccount =
    cluster === 'devnet'
      ? DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC
      : CREATE_CPMM_POOL_FEE_ACC;

  const { execute, extInfo } = await raydium.cpmm.createPool({
    programId,
    poolFeeAccount,
    mintA,
    mintB,
    mintAAmount,
    mintBAmount,
    startTime: new BN(0),
    feeConfig: feeConfigs[0],
    associatedOnly: false,
    ownerInfo: {
      useSOLBalance: useSolBalance,
    },
    txVersion: TxVersion.V0,
  });

  const { txId: poolTxId } = await execute({ sendAndConfirm: true });
  return {
    feeTxId,
    poolTxId,
    poolId: extInfo.address.poolId.toBase58(),
  };
}

export { explorerUrl };
