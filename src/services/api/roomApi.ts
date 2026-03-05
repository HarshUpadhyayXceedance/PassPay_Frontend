import { backendFetch } from "../../utils/backendAuth";
import { CommunityRoom, JoinRoomResult, CreateRoomBody } from "../../types/room";

export async function apiListRooms(): Promise<CommunityRoom[]> {
  const result = await backendFetch<{ rooms: CommunityRoom[] }>("/api/rooms");
  return result.rooms;
}

export async function apiCreateRoom(
  body: CreateRoomBody,
  publicKey: string
): Promise<JoinRoomResult> {
  return backendFetch<JoinRoomResult>("/api/rooms", {
    method: "POST",
    body: JSON.stringify(body),
  }, publicKey);
}

export async function apiJoinRoom(
  roomId: string,
  publicKey: string
): Promise<JoinRoomResult> {
  return backendFetch<JoinRoomResult>(`/api/rooms/${roomId}/join`, {
    method: "POST",
  }, publicKey);
}

export async function apiLeaveRoom(
  roomId: string,
  publicKey: string
): Promise<void> {
  await backendFetch<{ success: boolean }>(`/api/rooms/${roomId}/leave`, {
    method: "POST",
  }, publicKey);
}

export async function apiJoinMeeting(
  eventPda: string,
  publicKey: string
): Promise<JoinRoomResult> {
  return backendFetch<JoinRoomResult>(`/api/meetings/${eventPda}/join`, {
    method: "POST",
  }, publicKey);
}

export async function apiRequestSpeak(
  eventPda: string,
  publicKey: string
): Promise<{ token: string; livekitUrl: string }> {
  return backendFetch<{ token: string; livekitUrl: string }>(
    `/api/meetings/${eventPda}/request-speak`,
    { method: "POST" },
    publicKey
  );
}

export async function apiEndMeeting(
  eventPda: string,
  publicKey: string
): Promise<void> {
  await backendFetch<{ ended: boolean }>(
    `/api/meetings/${eventPda}/end`,
    { method: "DELETE" },
    publicKey
  );
}
