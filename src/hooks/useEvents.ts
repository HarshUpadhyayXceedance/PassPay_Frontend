import { useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useEventStore } from "../store/eventStore";
import { getConnection } from "../solana/config/connection";
import { getProgram } from "../solana/config/program";
import { createProvider } from "../solana/wallet/walletSession";
import { getWalletAdapter } from "./useWallet";
import { EventDisplay } from "../types/event";
import { lamportsToSOL } from "../utils/formatters";
import { fromUnixTimestamp } from "../utils/dateUtils";

export function useEvents() {
  const store = useEventStore();

  const fetchEvents = useCallback(async () => {
    store.setLoading(true);
    store.setError(null);
    try {
      const wallet = getWalletAdapter();
      if (!wallet) throw new Error("Wallet not connected");

      const provider = createProvider(wallet);
      const program = getProgram(provider);

      const accounts = await program.account.event.all();
      const events: EventDisplay[] = accounts.map((acc: any) => {
        const data = acc.account as any;
        const totalSeats = data.totalSeats;
        const ticketsSold = data.ticketsSold;
        return {
          publicKey: acc.publicKey.toBase58(),
          admin: data.admin.toBase58(),
          name: data.name,
          venue: data.venue,
          eventDate: fromUnixTimestamp(data.eventDate.toNumber()),
          ticketPrice: lamportsToSOL(data.ticketPrice.toNumber()),
          totalSeats,
          ticketsSold,
          availableSeats: totalSeats - ticketsSold,
          isActive: data.isActive,
          isSoldOut: ticketsSold >= totalSeats,
        };
      });

      store.setEvents(events);
    } catch (error: any) {
      store.setError(error.message ?? "Failed to fetch events");
    } finally {
      store.setLoading(false);
    }
  }, []);

  const getEvent = useCallback(
    (publicKey: string): EventDisplay | undefined => {
      return store.events.find((e) => e.publicKey === publicKey);
    },
    [store.events]
  );

  return {
    events: store.events,
    selectedEvent: store.selectedEvent,
    isLoading: store.isLoading,
    error: store.error,
    fetchEvents,
    getEvent,
    setSelectedEvent: store.setSelectedEvent,
  };
}
