import { PublicKey } from "@solana/web3.js";

export interface EventAccount {
  admin: PublicKey;
  name: string;
  venue: string;
  eventDate: number; // unix timestamp
  ticketPrice: number; // lamports
  totalSeats: number;
  ticketsSold: number;
  isActive: boolean;
  bump: number;
}

export interface EventDisplay {
  publicKey: string;
  admin: string;
  name: string;
  venue: string;
  eventDate: Date;
  ticketPrice: number; // in SOL
  totalSeats: number;
  ticketsSold: number;
  availableSeats: number;
  isActive: boolean;
  isSoldOut: boolean;
}
