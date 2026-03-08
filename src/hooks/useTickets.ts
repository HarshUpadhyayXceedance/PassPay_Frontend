import { useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useTicketStore } from "../store/ticketStore";
import { getProgram } from "../solana/config/program";
import { getConnection } from "../solana/config/connection";
import { createProvider } from "../solana/wallet/walletSession";
import { phantomWalletAdapter } from "../solana/wallet/phantomWalletAdapter";
import { findRefundRequestPda } from "../solana/pda";
import { TicketDisplay, RefundStatus, SEAT_TIER_NAMES } from "../types/ticket";
import { fromUnixTimestamp } from "../utils/dateUtils";
import { decodeAccountString } from "../utils/formatters";

export function useTickets() {
  const store = useTicketStore();

  const fetchMyTickets = useCallback(async () => {
    store.setLoading(true);
    store.setError(null);
    try {
      const wallet = phantomWalletAdapter;
      if (!wallet.getPublicKey()) throw new Error("Wallet not connected");

      const provider = createProvider(wallet);
      const program = getProgram(provider);
      const connection = getConnection();

      const allTickets = await program.account.ticket.all();
      const myTickets = allTickets.filter(
        (t: any) =>
          t.account.owner.toBase58() === wallet.getPublicKey()!.toBase58()
      );

      const refundPdaKeys = myTickets.map((acc: any) => {
        const data = acc.account as any;
        const [refundPda] = findRefundRequestPda(data.event, data.mint);
        return refundPda;
      });

      const refundAccounts: (any | null)[] = [];
      for (let i = 0; i < refundPdaKeys.length; i += 10) {
        const batch = refundPdaKeys.slice(i, i + 10);
        const results = await connection.getMultipleAccountsInfo(batch);
        refundAccounts.push(...results);
      }

      const tickets: TicketDisplay[] = await Promise.all(
        myTickets.map(async (acc: any, index: number) => {
          const data = acc.account as any;
          let eventName = "";
          let eventVenue = "";
          let eventDate = new Date();
          let eventIsCancelled = false;
          let eventIsActive = true;
          let eventIsMeetingEnded = false;

          try {
            const eventAcc = await program.account.event.fetch(data.event);
            const eventData = eventAcc as any;
            eventName = decodeAccountString(eventData.name);
            eventVenue = decodeAccountString(eventData.venue);
            eventDate = fromUnixTimestamp(eventData.eventDate.toNumber());
            eventIsCancelled = eventData.isCancelled ?? false;
            eventIsActive = eventData.isActive ?? true;
            eventIsMeetingEnded = eventData.isMeetingEnded ?? false;
          } catch {
          }

          let refundStatus: RefundStatus = "none";
          const refundAccountInfo = refundAccounts[index];
          if (refundAccountInfo && refundAccountInfo.data.length >= 113) {
            const statusByte = refundAccountInfo.data[112];
            switch (statusByte) {
              case 0:
                refundStatus = "pending";
                break;
              case 1:
                refundStatus = "approved";
                break;
              case 2:
                refundStatus = "rejected";
                break;
              default:
                refundStatus = "none";
            }
          }

          const seatTier = data.seatTier ?? 0;

          return {
            publicKey: acc.publicKey.toBase58(),
            eventKey: data.event.toBase58(),
            eventName,
            eventVenue,
            eventDate,
            owner: data.owner.toBase58(),
            mint: data.mint.toBase58(),
            seatNumber: data.seatNumber,
            seatTier,
            seatTierName: SEAT_TIER_NAMES[seatTier] ?? "General",
            isCheckedIn: data.isCheckedIn,
            checkedInAt: data.checkedInAt
              ? fromUnixTimestamp(data.checkedInAt.toNumber())
              : null,
            pricePaid: data.pricePaid?.toNumber?.() ?? 0,
            eventIsCancelled,
            eventIsActive,
            eventIsMeetingEnded,
            refundStatus,
          };
        })
      );

      store.setTickets(tickets);
    } catch (error: any) {
      store.setError(error.message ?? "Failed to fetch tickets");
    } finally {
      store.setLoading(false);
    }
  }, []);

  return {
    tickets: store.tickets,
    selectedTicket: store.selectedTicket,
    isLoading: store.isLoading,
    error: store.error,
    fetchMyTickets,
    setSelectedTicket: store.setSelectedTicket,
  };
}
