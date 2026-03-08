import { PublicKey } from "@solana/web3.js";

export interface TicketAccount {
  event: PublicKey;
  owner: PublicKey;
  mint: PublicKey;
  seatNumber: number;
  seatTier: number;
  isCheckedIn: boolean;
  checkedInAt: number;
  pricePaid: number;
  bump: number;
}

export type RefundStatus = "none" | "pending" | "approved" | "rejected";

export const SEAT_TIER_NAMES: Record<number, string> = {
  0: "Bronze",
  1: "Silver",
  2: "Gold",
  3: "VIP",
};

export interface TicketDisplay {
  publicKey: string;
  eventKey: string;
  eventName: string;
  eventVenue: string;
  eventDate: Date;
  owner: string;
  mint: string;
  seatNumber: number;
  seatTier: number;
  seatTierName: string;
  isCheckedIn: boolean;
  checkedInAt: Date | null;
  pricePaid: number;
  eventIsCancelled: boolean;
  eventIsActive: boolean;
  eventIsMeetingEnded: boolean;
  refundStatus: RefundStatus;
}
