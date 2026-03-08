import { PublicKey } from "@solana/web3.js";

export interface MerchantAccount {
  authority: PublicKey;
  event: PublicKey;
  name: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  totalReceived: number;
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
  totalReceived: number;
}

export interface MerchantProductAccount {
  merchant: PublicKey;
  name: string;
  description: string;
  price: number;
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
  price: number;
  imageUrl: string;
  isAvailable: boolean;
  totalSold: number;
}

export interface SeatTierDisplay {
  publicKey: string;
  eventKey: string;
  name: string;
  price: number;
  priceLamports: number;
  totalSeats: number;
  seatsSold: number;
  availableSeats: number;
  tierLevel: number;
  isRestricted: boolean;
}
