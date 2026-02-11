import { Connection } from "@solana/web3.js";
import { DEVNET_RPC, MAINNET_RPC } from "./constants";

export type NetworkType = "devnet" | "mainnet-beta";

let _connection: Connection | null = null;
let _currentNetwork: NetworkType = "devnet";

export function getConnection(network?: NetworkType): Connection {
  const target = network ?? _currentNetwork;
  if (!_connection || target !== _currentNetwork) {
    const rpc = target === "mainnet-beta" ? MAINNET_RPC : DEVNET_RPC;
    _connection = new Connection(rpc, "confirmed");
    _currentNetwork = target;
  }
  return _connection;
}

export function getRpcUrl(network?: NetworkType): string {
  const target = network ?? _currentNetwork;
  return target === "mainnet-beta" ? MAINNET_RPC : DEVNET_RPC;
}

export function getCurrentNetwork(): NetworkType {
  return _currentNetwork;
}

export function setNetwork(network: NetworkType): void {
  if (network !== _currentNetwork) {
    _connection = null;
    _currentNetwork = network;
  }
}
