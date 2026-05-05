import BN from 'bn.js';
import { Percent, Raydium, TxVersion } from '@raydium-io/raydium-sdk-v2';
import type { AddressLookupTableAccount } from '@solana/web3.js';
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

import { coerceRaydiumPoolByIdList, isCpmmPoolItem } from '@/lib/raydiumCpmmLaunch';
import { SOLANA_NETWORK } from '@/lib/solana';

export function raydiumClusterFromNetwork(): 'mainnet' | 'devnet' {
  return SOLANA_NETWORK === 'devnet' ? 'devnet' : 'mainnet';
}

async function loadRaydiumForPresaleTreasury(
  connection: Connection,
  cluster: 'mainnet' | 'devnet',
  treasury: Keypair,
) {
  const signAllTransactions = async <T extends Transaction | VersionedTransaction>(
    txs: T[],
  ): Promise<T[]> => {
    for (const tx of txs) {
      if (tx instanceof VersionedTransaction) {
        tx.sign([treasury]);
      } else {
        tx.partialSign(treasury);
      }
    }
    return txs;
  };
  return Raydium.load({
    connection,
    cluster,
    owner: treasury.publicKey,
    signAllTransactions,
    disableLoadToken: true,
  });
}

function filterOutComputeBudget(ixs: TransactionInstruction[]): TransactionInstruction[] {
  return ixs.filter((ix) => !ix.programId.equals(ComputeBudgetProgram.programId));
}

/**
 * Decompile Raydium-built v0 txs, strip their compute budget ixs (caller sets CU), concat after presale ixs.
 */
export async function mergePresaleInstructionsWithRaydiumV0(opts: {
  connection: Connection;
  buyer: PublicKey;
  treasury: Keypair;
  presaleInstructions: TransactionInstruction[];
  raydiumTransactions: VersionedTransaction[];
}): Promise<VersionedTransaction> {
  const altByAddr = new Map<string, AddressLookupTableAccount>();
  const rayIxs: TransactionInstruction[] = [];

  for (const vtx of opts.raydiumTransactions) {
    for (const l of vtx.message.addressTableLookups) {
      const k = l.accountKey.toBase58();
      if (!altByAddr.has(k)) {
        const res = await opts.connection.getAddressLookupTable(l.accountKey, {
          commitment: 'confirmed',
        });
        if (res.value) altByAddr.set(k, res.value);
      }
    }
    const altsForDecompile = vtx.message.addressTableLookups
      .map((l) => altByAddr.get(l.accountKey.toBase58()))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
    const inner = TransactionMessage.decompile(vtx.message, {
      addressLookupTableAccounts: altsForDecompile,
    });
    rayIxs.push(...filterOutComputeBudget(inner.instructions));
  }

  const alts = [...altByAddr.values()];
  const { blockhash } = await opts.connection.getLatestBlockhash('confirmed');
  const msg = new TransactionMessage({
    payerKey: opts.buyer,
    recentBlockhash: blockhash,
    instructions: [...opts.presaleInstructions, ...rayIxs],
  }).compileToV0Message(alts);

  const tx = new VersionedTransaction(msg);
  tx.sign([opts.treasury]);
  return tx;
}

export async function buildCpmmAddLiquidityVersionedTx(opts: {
  connection: Connection;
  cluster: 'mainnet' | 'devnet';
  treasury: Keypair;
  buyer: PublicKey;
  poolId: string;
  listingMint: string;
  /** Raw listing-token amount for the pool leg (mint A or B per baseIn). */
  rootsSideRaw: bigint;
  slippageBps?: number;
}): Promise<VersionedTransaction> {
  const trimmed = opts.poolId.trim();
  if (!trimmed) throw new Error('poolId empty');
  const rootsMint = opts.listingMint.trim();

  const raydium = await loadRaydiumForPresaleTreasury(opts.connection, opts.cluster, opts.treasury);
  const list = coerceRaydiumPoolByIdList(await raydium.api.fetchPoolById({ ids: trimmed }));
  const poolInfo = list.find(isCpmmPoolItem);
  if (!poolInfo) {
    throw new Error('Presale pool: not found or not Raydium CPMM on this cluster');
  }

  const isRootsA = poolInfo.mintA.address === rootsMint;
  const isRootsB = poolInfo.mintB.address === rootsMint;
  if (!isRootsA && !isRootsB) {
    throw new Error('Presale pool: must include the listing mint as mint A or B');
  }

  if (opts.rootsSideRaw <= 0n) {
    throw new Error('Presale pool: roots deposit amount must be positive');
  }

  const bps = Math.min(2_000, Math.max(50, opts.slippageBps ?? 200));
  const slippage = new Percent(new BN(bps), new BN(10_000));
  const inputAmount = new BN(opts.rootsSideRaw.toString());
  const baseIn = isRootsA;

  const built = await raydium.cpmm.addLiquidity({
    poolInfo,
    inputAmount,
    baseIn,
    slippage,
    txVersion: TxVersion.V0,
    feePayer: opts.buyer,
  });

  return built.transaction;
}
