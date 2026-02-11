import { create } from "zustand";
import { EventDisplay } from "../types/event";

interface EventState {
  events: EventDisplay[];
  selectedEvent: EventDisplay | null;
  isLoading: boolean;
  error: string | null;
  setEvents: (events: EventDisplay[]) => void;
  addEvent: (event: EventDisplay) => void;
  setSelectedEvent: (event: EventDisplay | null) => void;
  updateEvent: (publicKey: string, updates: Partial<EventDisplay>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useEventStore = create<EventState>((set) => ({
  events: [],
  selectedEvent: null,
  isLoading: false,
  error: null,

  setEvents: (events) => set({ events }),

  addEvent: (event) =>
    set((state) => ({ events: [...state.events, event] })),

  setSelectedEvent: (event) => set({ selectedEvent: event }),

  updateEvent: (publicKey, updates) =>
    set((state) => ({
      events: state.events.map((e) =>
        e.publicKey === publicKey ? { ...e, ...updates } : e
      ),
    })),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
