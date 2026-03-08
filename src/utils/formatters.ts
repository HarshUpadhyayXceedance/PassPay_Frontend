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

const COMMA_BYTES_RE = /^\d{1,3}(,\d{1,3})+$/;

export function decodeAccountString(val: any): string {
  if (typeof val === "string") {
    if (COMMA_BYTES_RE.test(val)) {
      try {
        const bytes = val.split(",").map(Number);
        const end = bytes.indexOf(0);
        const trimmed = end >= 0 ? bytes.slice(0, end) : bytes;
        return String.fromCharCode(...trimmed);
      } catch {
      }
    }
    return val.replace(/\0+$/, "");
  }

  if (val && typeof val === "object" && (val.length !== undefined || val.byteLength !== undefined)) {
    try {
      const arr = Array.from(val as ArrayLike<number>);
      const end = arr.indexOf(0);
      const trimmed = end >= 0 ? arr.slice(0, end) : arr;
      return String.fromCharCode(...trimmed);
    } catch {
      try {
        return Buffer.from(val).toString("utf8").replace(/\0+$/, "");
      } catch {
      }
    }
  }

  return String(val ?? "");
}
