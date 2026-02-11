export interface TicketQRPayload {
  type: "ticket";
  mint: string;
  owner: string;
  event: string;
}

export interface PaymentQRPayload {
  type: "payment";
  merchantAuthority: string;
  eventKey: string;
  amount: number; // in SOL
}

export type QRPayload = TicketQRPayload | PaymentQRPayload;

export function encodeQRPayload(payload: QRPayload): string {
  return JSON.stringify(payload);
}

export function decodeQRPayload(data: string): QRPayload | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed.type === "ticket" || parsed.type === "payment") {
      return parsed as QRPayload;
    }
    return null;
  } catch {
    return null;
  }
}
