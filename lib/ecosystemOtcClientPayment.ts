import {
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  type Connection,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstructionWithDerivation,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  getMint,
} from '@solana/spl-token';

import { ecosystemOtcUsdcMint } from '@/lib/ecosystemOtcConstants';

export type OtcClientPaymentParams = {
  connection: Connection;
  buyer: PublicKey;
  treasury: PublicKey;
  payWith: 'SOL' | 'USDC';
  solLamports: bigint;
  usdcMicro: bigint;
};

export type OtcClientPaymentBuilt = {
  transaction: VersionedTransaction;
  blockhash: string;
  lastValidBlockHeight: number;
};

/**
 * Unsigned v0 tx: buyer pays quoted SOL or USDC to the OTC treasury (same amounts the server verifies).
 */
export async function buildOtcTreasuryPaymentTx(
  params: OtcClientPaymentParams,
): Promise<OtcClientPaymentBuilt> {
  const { connection, buyer, treasury, payWith, solLamports, usdcMicro } = params;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

  if (payWith === 'SOL') {
    if (solLamports <= 0n) throw new Error('Invalid SOL amount');
    const ixs = [
      SystemProgram.transfer({
        fromPubkey: buyer,
        toPubkey: treasury,
        lamports: solLamports,
      }),
    ];
    const msg = new TransactionMessage({
      payerKey: buyer,
      recentBlockhash: blockhash,
      instructions: ixs,
    }).compileToV0Message();
    return { transaction: new VersionedTransaction(msg), blockhash, lastValidBlockHeight };
  }

  if (usdcMicro <= 0n) throw new Error('Invalid USDC amount');

  const mintPk = new PublicKey(ecosystemOtcUsdcMint());
  const mintAcc = await connection.getAccountInfo(mintPk);
  const tokenProgramId = mintAcc?.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;
  const mintData = await getMint(connection, mintPk, undefined, tokenProgramId);
  const decimals = mintData.decimals;

  const sourceAta = await getAssociatedTokenAddress(mintPk, buyer, false, tokenProgramId);
  const destAta = await getAssociatedTokenAddress(mintPk, treasury, false, tokenProgramId);

  const ixs = [];

  const srcInfo = await connection.getAccountInfo(sourceAta);
  if (!srcInfo) {
    ixs.push(
      createAssociatedTokenAccountIdempotentInstructionWithDerivation(
        buyer,
        buyer,
        mintPk,
        false,
        tokenProgramId,
      ),
    );
  }

  const dstInfo = await connection.getAccountInfo(destAta);
  if (!dstInfo) {
    ixs.push(
      createAssociatedTokenAccountIdempotentInstructionWithDerivation(
        buyer,
        treasury,
        mintPk,
        false,
        tokenProgramId,
      ),
    );
  }

  ixs.push(
    createTransferCheckedInstruction(
      sourceAta,
      mintPk,
      destAta,
      buyer,
      usdcMicro,
      decimals,
      [],
      tokenProgramId,
    ),
  );

  const msg = new TransactionMessage({
    payerKey: buyer,
    recentBlockhash: blockhash,
    instructions: ixs,
  }).compileToV0Message();
  return { transaction: new VersionedTransaction(msg), blockhash, lastValidBlockHeight };
}
