import { PublicKey } from "@solana/web3.js";
import { getProgram } from "../../solana/config/program";
import { createProvider } from "../../solana/wallet/walletSession";
import { getWalletAdapter } from "../../hooks/useWallet";
import { createEvent, CreateEventParams } from "../../solana/actions/createEvent";
import { buyTicket, BuyTicketParams } from "../../solana/actions/buyTicket";
import { checkIn, CheckInParams } from "../../solana/actions/checkIn";

export async function apiCreateEvent(params: CreateEventParams): Promise<string> {
  const wallet = getWalletAdapter();
  if (!wallet) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return createEvent(provider, params);
}

export async function apiBuyTicket(
  eventPda: string,
  metadataUri: string
): Promise<{ signature: string; mint: string }> {
  const wallet = getWalletAdapter();
  if (!wallet) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  const result = await buyTicket(provider, {
    eventPda: new PublicKey(eventPda),
    metadataUri,
  });
  return {
    signature: result.signature,
    mint: result.mint.toBase58(),
  };
}

export async function apiCheckIn(params: {
  eventPda: string;
  ticketMint: string;
  holderTokenAccount: string;
}): Promise<string> {
  const wallet = getWalletAdapter();
  if (!wallet) throw new Error("Wallet not connected");
  const provider = createProvider(wallet);
  return checkIn(provider, {
    eventPda: new PublicKey(params.eventPda),
    ticketMint: new PublicKey(params.ticketMint),
    holderTokenAccount: new PublicKey(params.holderTokenAccount),
  });
}
