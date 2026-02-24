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

export interface MerchantProductAccount {
  merchant: PublicKey;
  name: string;
  description: string;
  price: number; // lamports
  imageUrl: string;
  isAvailable: boolean;
  totalSold: number;
  bump: number;
}

export interface MerchantProductDisplay {
  publicKey: string;
  merchantKey: string;
  name: string;
  description: string;
  price: number; // in SOL
  imageUrl: string;
  isAvailable: boolean;
  totalSold: number;
}

export interface SeatTierDisplay {
  publicKey: string;
  eventKey: string;
  name: string;
  price: number; // in SOL
  priceLamports: number;
  totalSeats: number;
  seatsSold: number;
  availableSeats: number;
  tierLevel: number;
  isRestricted: boolean;
}
