'use client';

import { PublicKey } from '@solana/web3.js';

const REF_KEY = 'rootrecord_referrer';

export function isValidReferrerAddress(ref: string): boolean {
  const t = ref.trim();
  if (!t) return false;
  try {
    new PublicKey(t);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads `?ref=` from the URL, validates it as a Solana address, stores it in
 * localStorage, and returns the stored value (new or previous).
 */
export function captureReferrerFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref')?.trim() ?? '';
  if (ref && isValidReferrerAddress(ref)) {
    try {
      window.localStorage.setItem(REF_KEY, ref);
      return ref;
    } catch {
      return ref;
    }
  }
  return getStoredReferrer();
}

export function getStoredReferrer(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(REF_KEY)?.trim() ?? '';
    if (!v) return null;
    return isValidReferrerAddress(v) ? v : null;
  } catch {
    return null;
  }
}

export function clearReferrer(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(REF_KEY);
  } catch {
    /* noop */
  }
}
