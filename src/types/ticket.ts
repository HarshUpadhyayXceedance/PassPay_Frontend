import { PublicKey } from "@solana/web3.js";

export interface TicketAccount {
  event: PublicKey;
  owner: PublicKey;
  mint: PublicKey;
  seatNumber: number;
  isCheckedIn: boolean;
  checkedInAt: number;
  bump: number;
}

export interface TicketDisplay {
  publicKey: string;
  eventKey: string;
  eventName: string;
  eventVenue: string;
  eventDate: Date;
  owner: string;
  mint: string;
  seatNumber: number;
  isCheckedIn: boolean;
  checkedInAt: Date | null;
}
