/**
 * Pinata IPFS uploader (frontend-only stub).
 * Uses a JWT in NEXT_PUBLIC_PINATA_JWT. For production, route through a
 * server function so the JWT isn't exposed.
 */

export interface PinataUploadResult {
  cid: string;
  uri: string;
  gatewayUrl: string;
}

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
const GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud';

function gatewayUrl(cid: string): string {
  return `https://${GATEWAY}/ipfs/${cid}`;
}

export function isPinataConfigured(): boolean {
  return !!PINATA_JWT && PINATA_JWT !== 'YOUR_PINATA_JWT_HERE';
}

export async function uploadFileToPinata(file: File): Promise<PinataUploadResult> {
  if (!isPinataConfigured()) {
    throw new Error(
      'Pinata is not configured. Set NEXT_PUBLIC_PINATA_JWT in your .env.local',
    );
  }
  const fd = new FormData();
  fd.append('file', file);
  fd.append(
    'pinataMetadata',
    JSON.stringify({ name: `rootrecord-${Date.now()}-${file.name}` }),
  );

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: fd,
  });
  if (!res.ok) throw new Error(`Pinata file upload failed: ${res.status}`);
  const json = (await res.json()) as { IpfsHash: string };
  return {
    cid: json.IpfsHash,
    uri: `ipfs://${json.IpfsHash}`,
    gatewayUrl: gatewayUrl(json.IpfsHash),
  };
}

export async function uploadJsonToPinata(
  json: Record<string, unknown>,
  name = 'metadata.json',
): Promise<PinataUploadResult> {
  if (!isPinataConfigured()) {
    throw new Error(
      'Pinata is not configured. Set NEXT_PUBLIC_PINATA_JWT in your .env.local',
    );
  }
  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pinataMetadata: { name: `rootrecord-${Date.now()}-${name}` },
      pinataContent: json,
    }),
  });
  if (!res.ok) throw new Error(`Pinata JSON upload failed: ${res.status}`);
  const data = (await res.json()) as { IpfsHash: string };
  return {
    cid: data.IpfsHash,
    uri: `ipfs://${data.IpfsHash}`,
    gatewayUrl: gatewayUrl(data.IpfsHash),
  };
}
