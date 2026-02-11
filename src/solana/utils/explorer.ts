import { getCurrentNetwork } from "../config/connection";

const EXPLORER_BASE = "https://explorer.solana.com";

export function getExplorerUrl(
  type: "tx" | "address" | "token",
  value: string
): string {
  const network = getCurrentNetwork();
  const cluster = network === "mainnet-beta" ? "" : `?cluster=${network}`;
  return `${EXPLORER_BASE}/${type}/${value}${cluster}`;
}

export function getTxUrl(signature: string): string {
  return getExplorerUrl("tx", signature);
}

export function getAddressUrl(address: string): string {
  return getExplorerUrl("address", address);
}

export function getTokenUrl(mint: string): string {
  return getExplorerUrl("token", mint);
}
