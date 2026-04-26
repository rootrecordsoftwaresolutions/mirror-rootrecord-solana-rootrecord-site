'use client';

const REF_KEY = 'rootrecord_referrer';

export function captureReferrerFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref && ref.length >= 32 && ref.length <= 64) {
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
    return window.localStorage.getItem(REF_KEY);
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
