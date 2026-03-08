export enum RefundStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
}

export interface RefundRequestData {
  publicKey: string;
  event: string;
  ticketMint: string;
  holder: string;
  amount: number;
  status: RefundStatus;
  requestedAt: Date;
  processedAt: Date | null;
}

export interface EscrowData {
  publicKey: string;
  event: string;
  admin: string;
  totalCollected: number;
  totalRefunded: number;
  refundDeadline: Date;
  refundWindowHours: number;
  isReleased: boolean;
  releasedAt: Date | null;
  releasedAmount: number;
}
