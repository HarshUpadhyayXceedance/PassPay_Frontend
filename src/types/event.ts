import { PublicKey } from "@solana/web3.js";

export interface EventAccount {
  admin: PublicKey;
  name: string;
  venue: string;
  description: string;
  imageUrl: string;
  eventDate: number; // unix timestamp
  baseTicketPrice: number; // lamports
  currentTicketPrice: number; // lamports
  totalSeats: number;
  ticketsSold: number;
  isActive: boolean;
  isCancelled: boolean;
  earlyAccessDate: number;
  publicSaleDate: number;
  loyaltyDiscountsEnabled: boolean;
  dynamicPricingEnabled: boolean;
  minTicketPrice: number;
  maxTicketPrice: number;
  lastPriceUpdate: number;
  priceUpdateInterval: number;
  demandFactor: number;
  timeFactor: number;
  scarcityPremium: number;
  bump: number;
}

export interface EventDisplay {
  publicKey: string;
  admin: string;
  name: string;
  venue: string;
  description: string;
  imageUrl: string;
  eventDate: Date;
  ticketPrice: number; // current price in SOL (for backward compat)
  baseTicketPrice: number; // base price in SOL
  currentTicketPrice: number; // current price in SOL
  totalSeats: number;
  ticketsSold: number;
  availableSeats: number;
  isActive: boolean;
  isCancelled: boolean;
  isSoldOut: boolean;
  earlyAccessDate: Date;
  publicSaleDate: Date;
  loyaltyDiscountsEnabled: boolean;
  dynamicPricingEnabled: boolean;
  minTicketPrice: number; // in SOL
  maxTicketPrice: number; // in SOL
  lastPriceUpdate: number;
  priceUpdateInterval: number;
  demandFactor: number;
  timeFactor: number;
  scarcityPremium: number;
  eventType: "online" | "offline";
  isMeetingEnded: boolean;
}
