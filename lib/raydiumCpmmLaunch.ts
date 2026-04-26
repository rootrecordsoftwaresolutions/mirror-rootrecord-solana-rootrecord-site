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
import type { Transaction, VersionedTransaction } from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';

import { decimalStringToRawAmount } from '@/lib/bulkSol';
import {
  getConnection,
  resolveMintAndProgram,
  SOLANA_NETWORK,
  explorerUrl,
} from '@/lib/solana';

const WSOL_MINT = 'So11111111111111111111111111111111111111112';

export type CpmmMintPick = {
  address: string;
  decimals: number;
  programId: string;
};

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

/**
 * Create a Raydium CPMM pool: your SPL / Token-2022 mint vs WSOL, with initial liquidity
 * (one signed versioned transaction). Uses Raydium’s public API for fee configs.
 *
 * You pay Raydium’s on-chain pool-creation fee and network fees; no extra RootRecord fee here.
 */
export async function createCpmmPoolWithSol(
  wallet: WalletContextState,
  params: {
    /** Your token mint (base asset you already hold). */
    baseMint: string;
    /** Human amount of your token to deposit (mint decimals). */
    tokenAmount: string;
    /** Human SOL amount paired into the pool (wraps via `useSOLBalance`). */
    solAmount: string;
  },
): Promise<{ txId: string; poolId: string }> {
  if (!wallet.publicKey) {
    throw new Error('Connect your wallet first');
  }
  const signAll = wrapSignAllTransactions(wallet);
  if (!signAll) {
    throw new Error('Wallet must support signing transactions');
  }

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
  const quote = wsolPick();

  const rawToken = decimalStringToRawAmount(
    params.tokenAmount.trim(),
    base.decimals,
  );
  const rawSol = decimalStringToRawAmount(params.solAmount.trim(), 9);

  const bnToken = new BN(rawToken.toString());
  const bnSol = new BN(rawSol.toString());

  const [mintA, mintB, mintAAmount, mintBAmount] = orderCpmmPair(
    base,
    bnToken,
    quote,
    bnSol,
  );

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
      useSOLBalance: true,
    },
    txVersion: TxVersion.V0,
  });

  const { txId } = await execute({ sendAndConfirm: true });
  return {
    txId,
    poolId: extInfo.address.poolId.toBase58(),
  };
}

export { explorerUrl };
