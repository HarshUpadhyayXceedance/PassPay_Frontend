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
  productName?: string; // optional product reference
}

export type QRPayload = TicketQRPayload | PaymentQRPayload;

export function encodeQRPayload(payload: QRPayload): string {
  return JSON.stringify(payload);
}

export function decodeQRPayload(data: string): QRPayload | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed.type === "ticket") {
      // Normalize old QR format (mintAddress/eventKey) to new format (mint/event)
      return {
        type: "ticket",
        mint: parsed.mint ?? parsed.mintAddress,
        owner: parsed.owner,
        event: parsed.event ?? parsed.eventKey,
      } as TicketQRPayload;
    }
    if (parsed.type === "payment") {
      return parsed as PaymentQRPayload;
    }
    return null;
  } catch {
    return null;
  }
}
