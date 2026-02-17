import { useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useEventStore } from "../store/eventStore";
import { getConnection } from "../solana/config/connection";
import { getProgram } from "../solana/config/program";
import { createProvider } from "../solana/wallet/walletSession";
import { phantomWalletAdapter } from "../solana/wallet/phantomWalletAdapter";
import { EventDisplay } from "../types/event";
import { lamportsToSOL, decodeAccountString } from "../utils/formatters";
import { fromUnixTimestamp } from "../utils/dateUtils";
import { safeFetchAll } from "../solana/utils/safeFetchAll";

export function useEvents() {
  const store = useEventStore();

  const fetchEvents = useCallback(async () => {
    store.setLoading(true);
    store.setError(null);
    try {
      const wallet = phantomWalletAdapter;
      if (!wallet.getPublicKey()) throw new Error("Wallet not connected");

      const provider = createProvider(wallet);
      const program = getProgram(provider);
      const connection = getConnection();

      // Use safeFetchAll instead of program.account.event.all() to handle
      // old-schema accounts that are missing the image_url field
      const accounts = await safeFetchAll(connection, program, "Event");
      const events: EventDisplay[] = [];
      for (const acc of accounts) {
        try {
          const data = acc.account as any;
          const totalSeats = data.totalSeats;
          const ticketsSold = data.ticketsSold;

          // Handle both old (ticketPrice) and new (baseTicketPrice/currentTicketPrice) schema
          const basePrice = data.baseTicketPrice
            ? data.baseTicketPrice.toNumber()
            : data.ticketPrice?.toNumber() ?? 0;
          const currentPrice = data.currentTicketPrice
            ? data.currentTicketPrice.toNumber()
            : basePrice;

          events.push({
            publicKey: acc.publicKey.toBase58(),
            admin: data.admin.toBase58(),
            name: decodeAccountString(data.name),
            venue: decodeAccountString(data.venue),
            description: decodeAccountString(data.description ?? ""),
            imageUrl: decodeAccountString(data.imageUrl ?? ""),
            eventDate: fromUnixTimestamp(data.eventDate?.toNumber?.() ?? data.eventDate ?? 0),
            ticketPrice: lamportsToSOL(currentPrice),
            baseTicketPrice: lamportsToSOL(basePrice),
            currentTicketPrice: lamportsToSOL(currentPrice),
            totalSeats,
            ticketsSold,
            availableSeats: totalSeats - ticketsSold,
            isActive: data.isActive,
            isSoldOut: ticketsSold >= totalSeats,
            earlyAccessDate: fromUnixTimestamp(data.earlyAccessDate?.toNumber?.() ?? 0),
            publicSaleDate: fromUnixTimestamp(data.publicSaleDate?.toNumber?.() ?? 0),
            loyaltyDiscountsEnabled: data.loyaltyDiscountsEnabled ?? false,
            dynamicPricingEnabled: data.dynamicPricingEnabled ?? false,
            minTicketPrice: lamportsToSOL(data.minTicketPrice?.toNumber?.() ?? 0),
            maxTicketPrice: lamportsToSOL(data.maxTicketPrice?.toNumber?.() ?? 0),
            lastPriceUpdate: data.lastPriceUpdate?.toNumber?.() ?? 0,
            priceUpdateInterval: data.priceUpdateInterval?.toNumber?.() ?? 0,
            demandFactor: data.demandFactor ?? 0,
            timeFactor: data.timeFactor ?? 0,
            scarcityPremium: data.scarcityPremium ?? 0,
          });
        } catch (e) {
          // Skip accounts with old schema that can't be deserialized
          console.warn("Skipping event account", acc.publicKey.toBase58(), e);
        }
      }

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
