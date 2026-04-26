import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  type Cluster,
} from '@solana/web3.js';
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createInitializeMint2Instruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
} from '@solana/spl-token';
import {
  createCreateMetadataAccountV3Instruction,
  createUpdateMetadataAccountV2Instruction,
  PROGRAM_ID as METADATA_PROGRAM_ID,
} from '@metaplex-foundation/mpl-token-metadata';
import type { WalletContextState } from '@solana/wallet-adapter-react';

export const SOLANA_NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK ||
  'mainnet-beta') as Cluster;

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com';

export const FEE_WALLET_STR = process.env.NEXT_PUBLIC_FEE_WALLET || '';

/** Values treated as “not configured” for fee collection. */
const FEE_WALLET_PLACEHOLDERS = new Set([
  '',
  'YOUR_FEE_WALLET_PUBKEY_HERE',
  'YourActualFeeWalletPubkeyHere',
]);

export const CREATE_FEE_SOL = parseFloat(
  process.env.NEXT_PUBLIC_CREATE_FEE_SOL || '0.025',
);
export const ACTION_FEE_SOL = parseFloat(
  process.env.NEXT_PUBLIC_ACTION_FEE_SOL || '0.01',
);

export function getConnection(): Connection {
  return new Connection(RPC_URL, 'confirmed');
}

function getFeeWallet(): PublicKey | null {
  const trimmed = FEE_WALLET_STR.trim();
  if (FEE_WALLET_PLACEHOLDERS.has(trimmed)) {
    return null;
  }
  try {
    return new PublicKey(trimmed);
  } catch {
    return null;
  }
}

export function isFeeWalletConfigured(): boolean {
  return getFeeWallet() !== null;
}

export function feeTransferIx(
  payer: PublicKey,
  amountSol: number,
): TransactionInstruction | null {
  const fw = getFeeWallet();
  if (!fw) return null;
  return SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: fw,
    lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
  });
}

export function explorerUrl(
  signatureOrAddress: string,
  type: 'tx' | 'address' = 'tx',
): string {
  const cluster =
    SOLANA_NETWORK === 'mainnet-beta' ? '' : `?cluster=${SOLANA_NETWORK}`;
  return `https://solscan.io/${type}/${signatureOrAddress}${cluster}`;
}

export function solanaFmUrl(
  signatureOrAddress: string,
  type: 'tx' | 'address' = 'tx',
): string {
  const cluster =
    SOLANA_NETWORK === 'mainnet-beta'
      ? 'mainnet-alpha'
      : SOLANA_NETWORK === 'devnet'
        ? 'devnet-solana'
        : 'testnet-solana';
  return `https://solana.fm/${type}/${signatureOrAddress}?cluster=${cluster}`;
}

export interface CreateTokenInput {
  name: string;
  symbol: string;
  decimals: number;
  supply: bigint;
  uri: string;
}

export interface CreateTokenResult {
  signature: string;
  mint: string;
  ata: string;
}

/**
 * Derive Metaplex metadata PDA for a given mint
 */
export function metadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METADATA_PROGRAM_ID,
  );
  return pda;
}

/**
 * Build and send a single transaction:
 *  1. create mint account
 *  2. initialize mint
 *  3. create ATA for payer
 *  4. mint full supply
 *  5. create Metaplex metadata account v3
 *  6. transfer create fee to platform fee wallet
 *  7. (optional) referral note via memo (already tracked client-side)
 */
export async function createSplToken(
  wallet: WalletContextState,
  input: CreateTokenInput,
): Promise<CreateTokenResult> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }
  const connection = getConnection();
  const payer = wallet.publicKey;

  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  const lamportsForMint = await getMinimumBalanceForRentExemptMint(connection);

  const ata = await getAssociatedTokenAddress(mint, payer);

  const metadata = metadataPda(mint);

  const tx = new Transaction();

  // 1. create mint account
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: MINT_SIZE,
      lamports: lamportsForMint,
      programId: TOKEN_PROGRAM_ID,
    }),
  );

  // 2. initialize mint
  tx.add(
    createInitializeMint2Instruction(
      mint,
      input.decimals,
      payer, // mint authority
      payer, // freeze authority
      TOKEN_PROGRAM_ID,
    ),
  );

  // 3. create ATA
  tx.add(createAssociatedTokenAccountInstruction(payer, ata, payer, mint));

  // 4. mint full supply (supply * 10^decimals)
  const fullSupply =
    input.supply * BigInt(10) ** BigInt(input.decimals);
  tx.add(createMintToInstruction(mint, ata, payer, fullSupply));

  // 5. metaplex metadata
  tx.add(
    createCreateMetadataAccountV3Instruction(
      {
        metadata,
        mint,
        mintAuthority: payer,
        payer,
        updateAuthority: payer,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: input.name.slice(0, 32),
            symbol: input.symbol.slice(0, 10),
            uri: input.uri.slice(0, 200),
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
          },
          isMutable: true,
          collectionDetails: null,
        },
      },
    ),
  );

  // 6. fee transfer
  const feeIx = feeTransferIx(payer, CREATE_FEE_SOL);
  if (feeIx) tx.add(feeIx);

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;
  tx.partialSign(mintKeypair);

  const signed = await wallet.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    maxRetries: 5,
  });
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed',
  );

  return { signature, mint: mint.toBase58(), ata: ata.toBase58() };
}

async function detectMintProgram(mint: PublicKey): Promise<PublicKey> {
  const info = await getConnection().getAccountInfo(mint, 'confirmed');
  if (!info) throw new Error('Mint not found');
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  return TOKEN_PROGRAM_ID;
}

async function sendSimpleTx(
  wallet: WalletContextState,
  ixs: TransactionInstruction[],
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }
  const connection = getConnection();
  const tx = new Transaction().add(...ixs);
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = wallet.publicKey;

  const signed = await wallet.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    maxRetries: 5,
  });
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed',
  );
  return signature;
}

export async function revokeMintAuthority(
  wallet: WalletContextState,
  mintAddress: string,
): Promise<string> {
  if (!wallet.publicKey) throw new Error('Wallet not connected');
  const mint = new PublicKey(mintAddress);
  const programId = await detectMintProgram(mint);
  const ixs: TransactionInstruction[] = [
    createSetAuthorityInstruction(
      mint,
      wallet.publicKey,
      AuthorityType.MintTokens,
      null,
      [],
      programId,
    ),
  ];
  const fee = feeTransferIx(wallet.publicKey, ACTION_FEE_SOL);
  if (fee) ixs.push(fee);
  return sendSimpleTx(wallet, ixs);
}

export async function revokeFreezeAuthority(
  wallet: WalletContextState,
  mintAddress: string,
): Promise<string> {
  if (!wallet.publicKey) throw new Error('Wallet not connected');
  const mint = new PublicKey(mintAddress);
  const programId = await detectMintProgram(mint);
  const ixs: TransactionInstruction[] = [
    createSetAuthorityInstruction(
      mint,
      wallet.publicKey,
      AuthorityType.FreezeAccount,
      null,
      [],
      programId,
    ),
  ];
  const fee = feeTransferIx(wallet.publicKey, ACTION_FEE_SOL);
  if (fee) ixs.push(fee);
  return sendSimpleTx(wallet, ixs);
}

export async function mintMore(
  wallet: WalletContextState,
  mintAddress: string,
  amount: bigint,
  decimals: number,
): Promise<string> {
  if (!wallet.publicKey) throw new Error('Wallet not connected');
  const mint = new PublicKey(mintAddress);
  const programId = await detectMintProgram(mint);
  const ata = await getAssociatedTokenAddress(
    mint,
    wallet.publicKey,
    false,
    programId,
  );
  const fullAmount = amount * BigInt(10) ** BigInt(decimals);

  const connection = getConnection();
  const ataInfo = await connection.getAccountInfo(ata);
  const ixs: TransactionInstruction[] = [];
  if (!ataInfo) {
    ixs.push(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        ata,
        wallet.publicKey,
        mint,
        programId,
      ),
    );
  }
  ixs.push(
    createMintToInstruction(
      mint,
      ata,
      wallet.publicKey,
      fullAmount,
      [],
      programId,
    ),
  );
  const fee = feeTransferIx(wallet.publicKey, ACTION_FEE_SOL);
  if (fee) ixs.push(fee);
  return sendSimpleTx(wallet, ixs);
}

export interface UpdateMetadataInput {
  name: string;
  symbol: string;
  uri: string;
}

export async function updateTokenMetadata(
  wallet: WalletContextState,
  mintAddress: string,
  data: UpdateMetadataInput,
): Promise<string> {
  if (!wallet.publicKey) throw new Error('Wallet not connected');
  const mint = new PublicKey(mintAddress);
  const metadata = metadataPda(mint);
  const ix = createUpdateMetadataAccountV2Instruction(
    {
      metadata,
      updateAuthority: wallet.publicKey,
    },
    {
      updateMetadataAccountArgsV2: {
        data: {
          name: data.name.slice(0, 32),
          symbol: data.symbol.slice(0, 10),
          uri: data.uri.slice(0, 200),
          sellerFeeBasisPoints: 0,
          creators: null,
          collection: null,
          uses: null,
        },
        updateAuthority: wallet.publicKey,
        primarySaleHappened: null,
        isMutable: null,
      },
    },
  );
  const ixs: TransactionInstruction[] = [ix];
  const fee = feeTransferIx(wallet.publicKey, ACTION_FEE_SOL);
  if (fee) ixs.push(fee);
  return sendSimpleTx(wallet, ixs);
}
