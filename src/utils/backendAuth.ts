/**
 * Backend API auth utility.
 *
 * Auth flow:
 *  1. After wallet connects, call `signInToBackend(pubkey, signMessage)`.
 *     This signs a timestamped JSON message with Phantom (one Phantom popup),
 *     posts to POST /api/auth, and stores the returned JWT in SecureStore.
 *  2. All subsequent backendFetch calls include the JWT as a Bearer token.
 *  3. On wallet disconnect, call `clearAuthToken(pubkey)`.
 *
 * Fallback: if no JWT is available (Expo Go dev mode), the legacy
 * x-wallet-pubkey header is sent instead (no cryptographic proof).
 */
import * as SecureStore from "expo-secure-store";
import { Buffer } from "buffer";

export const BACKEND_URL = "https://passpay-backend-web2-production.up.railway.app";

const JWT_KEY = (pubkey: string) => `backend_jwt_${pubkey}`;

// ── JWT Storage ──────────────────────────────────────────────────────────────

export async function storeAuthToken(pubkey: string, token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(JWT_KEY(pubkey), token);
  } catch (e) {
    console.warn("[Auth] Failed to store JWT:", e);
  }
}

export async function getAuthToken(pubkey: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(JWT_KEY(pubkey));
  } catch {
    return null;
  }
}

export async function clearAuthToken(pubkey: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(JWT_KEY(pubkey));
  } catch {}
}

// ── Sign-in ──────────────────────────────────────────────────────────────────

/**
 * Authenticate with the backend by signing a challenge with Phantom.
 * Shows ONE Phantom approval dialog, then stores the JWT (7-day expiry).
 *
 * @param pubkey   wallet public key (base58)
 * @param signMsg  phantomWalletAdapter.signMessage
 */
export async function signInToBackend(
  pubkey: string,
  signMsg: (msg: Uint8Array) => Promise<Uint8Array>
): Promise<string> {
  const messageObj = { app: "passpay", pubkey, ts: Date.now() };
  const messageBytes = new TextEncoder().encode(JSON.stringify(messageObj));

  // Phantom shows: "PassPay wants you to sign: {...}"
  const signedMessage = await signMsg(messageBytes);

  const response = await fetch(`${BACKEND_URL}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pubkey,
      signedMessage: Buffer.from(signedMessage).toString("base64"),
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Auth failed: HTTP ${response.status}`);
  }

  const { token } = await response.json();
  if (!token) throw new Error("No token returned from backend");

  await storeAuthToken(pubkey, token);
  return token;
}

// ── Auth-expired callback ─────────────────────────────────────────────────────

let _authExpiredHandler: (() => void) | null = null;

/**
 * Register a callback that fires when the backend returns 401.
 * The root layout uses this to force wallet disconnect and redirect to auth.
 */
export function registerAuthExpiredHandler(handler: () => void): void {
  _authExpiredHandler = handler;
}

// ── Fetch ────────────────────────────────────────────────────────────────────

/**
 * Authenticated fetch to the PassPay backend.
 * Uses JWT Bearer token if available, falls back to legacy pubkey header.
 * On 401: clears the stale JWT and fires the auth-expired handler.
 */
export async function backendFetch<T>(
  path: string,
  options: RequestInit = {},
  publicKey?: string
): Promise<T> {
  const authHeader: Record<string, string> = {};

  if (publicKey) {
    const token = await getAuthToken(publicKey);
    if (token) {
      authHeader["Authorization"] = `Bearer ${token}`;
    } else {
      // Legacy fallback for Expo Go / first launch before sign-in
      authHeader["x-wallet-pubkey"] = publicKey;
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeader,
    ...(options.headers as Record<string, string> ?? {}),
  };

  const response = await fetch(`${BACKEND_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    // JWT expired or revoked — clear stale token and notify root layout
    if (response.status === 401 && publicKey) {
      await clearAuthToken(publicKey).catch(() => {});
      _authExpiredHandler?.();
    }

    let errorMsg = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      errorMsg = body.error ?? body.details ?? errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}
