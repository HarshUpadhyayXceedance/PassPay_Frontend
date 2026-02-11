import { create } from "zustand";
import { TicketDisplay } from "../types/ticket";

interface TicketState {
  tickets: TicketDisplay[];
  selectedTicket: TicketDisplay | null;
  isLoading: boolean;
  error: string | null;
  setTickets: (tickets: TicketDisplay[]) => void;
  addTicket: (ticket: TicketDisplay) => void;
  setSelectedTicket: (ticket: TicketDisplay | null) => void;
  updateTicket: (publicKey: string, updates: Partial<TicketDisplay>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTicketStore = create<TicketState>((set) => ({
  tickets: [],
  selectedTicket: null,
  isLoading: false,
  error: null,

  setTickets: (tickets) => set({ tickets }),

  addTicket: (ticket) =>
    set((state) => ({ tickets: [...state.tickets, ticket] })),

  setSelectedTicket: (ticket) => set({ selectedTicket: ticket }),

  updateTicket: (publicKey, updates) =>
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.publicKey === publicKey ? { ...t, ...updates } : t
      ),
    })),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
