import { useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useRoomStore } from "../store/roomStore";
import { useWalletStore } from "../store/walletStore";
import {
  apiListRooms,
  apiCreateRoom,
  apiJoinRoom,
  apiLeaveRoom,
  apiJoinMeeting,
  apiRequestSpeak,
  apiEndMeeting,
} from "../services/api/roomApi";
import { CreateRoomBody, JoinRoomResult } from "../types/room";
import { selfCheckIn } from "../solana/actions/selfCheckIn";
import { endMeeting as endMeetingOnChain } from "../solana/actions/endMeeting";
import { createProvider } from "../solana/wallet/walletSession";
import { phantomWalletAdapter } from "../solana/wallet/phantomWalletAdapter";

export function useRooms() {
  const store = useRoomStore();
  const { publicKey } = useWalletStore();

  const fetchRooms = useCallback(async () => {
    store.setLoading(true);
    store.setError(null);
    try {
      const rooms = await apiListRooms();
      store.setRooms(rooms);
    } catch (err: any) {
      store.setError(err.message);
    } finally {
      store.setLoading(false);
    }
  }, []);

  const createRoom = useCallback(
    async (body: CreateRoomBody): Promise<JoinRoomResult> => {
      if (!publicKey) throw new Error("Wallet not connected");
      const result = await apiCreateRoom(body, publicKey);
      store.addRoom(result.room);
      return result;
    },
    [publicKey]
  );

  const joinRoom = useCallback(
    async (roomId: string): Promise<JoinRoomResult> => {
      if (!publicKey) throw new Error("Wallet not connected");
      return apiJoinRoom(roomId, publicKey);
    },
    [publicKey]
  );

  const leaveRoom = useCallback(
    async (roomId: string): Promise<void> => {
      if (!publicKey) return;
      await apiLeaveRoom(roomId, publicKey);
    },
    [publicKey]
  );

  const joinMeeting = useCallback(
    async (eventPda: string): Promise<JoinRoomResult> => {
      if (!publicKey) throw new Error("Wallet not connected");
      return apiJoinMeeting(eventPda, publicKey);
    },
    [publicKey]
  );

  const requestSpeak = useCallback(
    async (eventPda: string): Promise<{ token: string; livekitUrl: string }> => {
      if (!publicKey) throw new Error("Wallet not connected");
      return apiRequestSpeak(eventPda, publicKey);
    },
    [publicKey]
  );

  /**
   * Confirm attendance for an online event on-chain.
   * Calls the `self_check_in` Solana instruction — the user signs with Phantom.
   * Marks `ticket.is_checked_in = true` and updates the UserAttendanceRecord
   * (event count, streak, tier) exactly like a physical QR check-in.
   */
  const confirmAttendance = useCallback(
    async (eventPda: string, ticketMint: string): Promise<string> => {
      if (!publicKey) throw new Error("Wallet not connected");
      const provider = createProvider(phantomWalletAdapter);
      return selfCheckIn(provider, {
        eventPda: new PublicKey(eventPda),
        ticketMint: new PublicKey(ticketMint),
      });
    },
    [publicKey]
  );

  /**
   * End meeting: set is_meeting_ended=true on-chain (wallet signs),
   * then call backend to clean up LiveKit room + Redis entry.
   */
  const endMeeting = useCallback(
    async (eventPda: string): Promise<void> => {
      if (!publicKey) throw new Error("Wallet not connected");
      // 1. On-chain: set is_meeting_ended = true (requires admin wallet signature)
      const provider = createProvider(phantomWalletAdapter);
      await endMeetingOnChain(provider, new PublicKey(eventPda));
      // 2. Backend: clean up LiveKit room + Redis entry
      await apiEndMeeting(eventPda, publicKey);
    },
    [publicKey]
  );

  return {
    rooms: store.rooms,
    isLoading: store.isLoading,
    error: store.error,
    fetchRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    joinMeeting,
    requestSpeak,
    confirmAttendance,
    endMeeting,
  };
}
