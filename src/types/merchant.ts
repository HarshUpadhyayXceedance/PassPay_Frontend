import { PublicKey } from "@solana/web3.js";

export interface MerchantAccount {
  authority: PublicKey;
  event: PublicKey;
  name: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  totalReceived: number; // lamports
  bump: number;
}

export interface MerchantDisplay {
  publicKey: string;
  authority: string;
  eventKey: string;
  name: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  totalReceived: number; // in SOL
}
