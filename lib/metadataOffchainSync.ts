/**
 * Helpers for keeping Metaplex `uri` JSON aligned with on-chain name/symbol updates.
 */

/** Max JSON payload we will pull from a metadata URI (bytes). */
export const METADATA_JSON_FETCH_MAX_BYTES = 600_000;

/**
 * Turn `ipfs://…` into an HTTPS gateway URL suitable for server-side fetch.
 */
export function resolveMetadataJsonHttpUrl(uri: string): string {
  const t = uri.trim();
  if (!t) return '';
  if (/^ipfs:\/\//i.test(t)) {
    const path = t.slice('ipfs://'.length).replace(/^ipfs\//, '');
    return `https://ipfs.io/ipfs/${path}`;
  }
  return t;
}

/**
 * Conservative allowlist for metadata JSON fetch (SSRF mitigation).
 */
export function isAllowedPublicMetadataUrl(urlStr: string): boolean {
  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  const host = u.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local')
  ) {
    return false;
  }
  if (host === 'arweave.net') return u.pathname.length > 1;
  if (host === 'ipfs.io' && u.pathname.startsWith('/ipfs/')) return true;
  if (host === 'cloudflare-ipfs.com' && u.pathname.startsWith('/ipfs/')) return true;
  if (host.endsWith('dweb.link') && u.pathname.startsWith('/ipfs/')) return true;
  if (host.endsWith('pinata.cloud') && u.pathname.includes('/ipfs/')) return true;
  if (host.endsWith('ipfs.nftstorage.link') || host.endsWith('ipfs.w3s.link')) return true;
  if (host === 'gateway.irys.xyz' || host.endsWith('.irys.xyz')) return true;
  if (u.pathname.includes('/ipfs/')) return true;
  return false;
}

export function mergeTokenMetadataJsonFields(
  parsed: Record<string, unknown>,
  name: string,
  symbol: string,
): Record<string, unknown> {
  return {
    ...parsed,
    name: name.slice(0, 32),
    symbol: symbol.slice(0, 10),
  };
}
