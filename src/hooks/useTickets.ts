import { useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useTicketStore } from "../store/ticketStore";
import { getProgram } from "../solana/config/program";
import { createProvider } from "../solana/wallet/walletSession";
import { phantomWalletAdapter } from "../solana/wallet/phantomWalletAdapter";
import { TicketDisplay } from "../types/ticket";
import { fromUnixTimestamp } from "../utils/dateUtils";

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

      const allTickets = await program.account.ticket.all();
      const myTickets = allTickets.filter(
        (t: any) =>
          t.account.owner.toBase58() === wallet.getPublicKey()!.toBase58()
      );

      const tickets: TicketDisplay[] = await Promise.all(
        myTickets.map(async (acc: any) => {
          const data = acc.account as any;
          let eventName = "";
          let eventVenue = "";
          let eventDate = new Date();

          try {
            const eventAcc = await program.account.event.fetch(data.event);
            const eventData = eventAcc as any;
            eventName = eventData.name;
            eventVenue = eventData.venue;
            eventDate = fromUnixTimestamp(eventData.eventDate.toNumber());
          } catch {
            // event might not exist
          }

          return {
            publicKey: acc.publicKey.toBase58(),
            eventKey: data.event.toBase58(),
            eventName,
            eventVenue,
            eventDate,
            owner: data.owner.toBase58(),
            mint: data.mint.toBase58(),
            seatNumber: data.seatNumber,
            isCheckedIn: data.isCheckedIn,
            checkedInAt: data.checkedInAt
              ? fromUnixTimestamp(data.checkedInAt.toNumber())
              : null,
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
