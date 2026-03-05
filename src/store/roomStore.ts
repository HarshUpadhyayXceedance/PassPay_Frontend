import { create } from "zustand";
import { CommunityRoom } from "../types/room";

interface RoomState {
  rooms: CommunityRoom[];
  isLoading: boolean;
  error: string | null;
  setRooms: (rooms: CommunityRoom[]) => void;
  addRoom: (room: CommunityRoom) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  rooms: [],
  isLoading: false,
  error: null,
  setRooms: (rooms) => set({ rooms }),
  addRoom: (room) => set((state) => ({ rooms: [room, ...state.rooms] })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
