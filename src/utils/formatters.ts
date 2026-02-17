import { LAMPORTS_PER_SOL } from "../solana/config/constants";

export function formatSOL(lamportsOrSol: number): string {
  return lamportsOrSol.toFixed(4).replace(/\.?0+$/, "");
}

export function lamportsToSOL(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}

/**
 * Regex that matches comma-separated byte values like "69,118,101,110,116,32,49".
 * Borsh/Buffer polyfills in React Native sometimes produce this instead of UTF-8.
 */
const COMMA_BYTES_RE = /^\d{1,3}(,\d{1,3})+$/;

/**
 * Safely extract a string from Borsh-deserialized account data.
 * Anchor may return strings as Uint8Array/Buffer or even comma-separated
 * byte strings in React Native due to polyfill differences.
 */
export function decodeAccountString(val: any): string {
  // Already a proper string
  if (typeof val === "string") {
    // Detect comma-separated byte values (e.g. "69,118,101,110,116,32,49" → "Event 1")
    if (COMMA_BYTES_RE.test(val)) {
      try {
        const bytes = val.split(",").map(Number);
        // Filter out trailing null bytes and decode
        const end = bytes.indexOf(0);
        const trimmed = end >= 0 ? bytes.slice(0, end) : bytes;
        return String.fromCharCode(...trimmed);
      } catch {
        // fall through
      }
    }
    return val.replace(/\0+$/, "");
  }

  // Uint8Array, Buffer, or plain number array
  if (val && typeof val === "object" && (val.length !== undefined || val.byteLength !== undefined)) {
    try {
      // Use String.fromCharCode as primary (no Buffer dependency)
      const arr = Array.from(val as ArrayLike<number>);
      const end = arr.indexOf(0);
      const trimmed = end >= 0 ? arr.slice(0, end) : arr;
      return String.fromCharCode(...trimmed);
    } catch {
      // Fallback to Buffer if available
      try {
        return Buffer.from(val).toString("utf8").replace(/\0+$/, "");
      } catch {
        // fall through
      }
    }
  }

  return String(val ?? "");
}
