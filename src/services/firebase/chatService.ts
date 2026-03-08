import {
  ref,
  push,
  set,
  remove,
  query,
  orderByChild,
  limitToLast,
  onChildAdded,
  onValue,
  off,
} from "firebase/database";
import { firebaseDb } from "../../config/firebase";
import { ChatMessage } from "../../types/room";

export async function sendFirebaseMessage(
  roomId: string,
  sender: string,
  senderFull: string,
  text: string
): Promise<void> {
  const messagesRef = ref(firebaseDb, `rooms/${roomId}/messages`);
  await push(messagesRef, {
    sender,
    senderFull,
    text,
    timestamp: Date.now(),
  });
}

export function subscribeRoomMessages(
  roomId: string,
  onMessage: (msg: ChatMessage) => void,
  onError?: (err: Error) => void
): () => void {
  const messagesRef = query(
    ref(firebaseDb, `rooms/${roomId}/messages`),
    orderByChild("timestamp"),
    limitToLast(50)
  );

  const handler = onChildAdded(
    messagesRef,
    (snapshot) => {
      try {
        const data = snapshot.val();
        if (!data) return;
        const msg: ChatMessage = {
          id: snapshot.key ?? `${Date.now()}`,
          sender: data.sender ?? "Unknown",
          senderFull: data.senderFull ?? "",
          text: data.text ?? "",
          timestamp: data.timestamp ?? Date.now(),
        };
        onMessage(msg);
      } catch (e) {
        console.warn("[Chat] parse error:", e);
      }
    },
    (err) => {
      console.warn("[Chat] Firebase subscribe error:", err.message);
      onError?.(err);
    }
  );

  return () => {
    off(messagesRef, "child_added", handler);
  };
}

export async function writeParticipantName(
  roomId: string,
  pubkey: string,
  name: string
): Promise<void> {
  const nameRef = ref(firebaseDb, `rooms/${roomId}/names/${pubkey}`);
  await set(nameRef, { name, pubkey });
}

export async function removeParticipantName(
  roomId: string,
  pubkey: string
): Promise<void> {
  const nameRef = ref(firebaseDb, `rooms/${roomId}/names/${pubkey}`);
  await remove(nameRef);
}

export function subscribeParticipantNames(
  roomId: string,
  onNames: (names: Record<string, string>) => void
): () => void {
  const namesRef = ref(firebaseDb, `rooms/${roomId}/names`);

  const handler = onValue(namesRef, (snapshot) => {
    const map: Record<string, string> = {};
    const data = snapshot.val();
    if (data) {
      for (const [pubkey, entry] of Object.entries(data as Record<string, any>)) {
        if (entry?.name) map[pubkey] = entry.name;
      }
    }
    onNames(map);
  });

  return () => off(namesRef, "value", handler);
}

export type SpeakRequestStatus = "pending" | "approved" | "denied";

export interface SpeakRequest {
  pubkey: string;
  name: string;
  requestedAt: number;
  status: SpeakRequestStatus;
}

export async function writeSpeakRequest(
  roomId: string,
  pubkey: string,
  name: string
): Promise<void> {
  const reqRef = ref(firebaseDb, `rooms/${roomId}/speakRequests/${pubkey}`);
  await set(reqRef, { pubkey, name, requestedAt: Date.now(), status: "pending" });
}

export async function updateSpeakRequestStatus(
  roomId: string,
  pubkey: string,
  status: SpeakRequestStatus,
  name?: string
): Promise<void> {
  const reqRef = ref(firebaseDb, `rooms/${roomId}/speakRequests/${pubkey}`);
  await set(reqRef, { pubkey, name: name ?? "", status, updatedAt: Date.now() });
}

export async function removeSpeakRequest(
  roomId: string,
  pubkey: string
): Promise<void> {
  const reqRef = ref(firebaseDb, `rooms/${roomId}/speakRequests/${pubkey}`);
  await remove(reqRef);
}

export function subscribeSpeakRequests(
  roomId: string,
  onRequests: (requests: SpeakRequest[]) => void
): () => void {
  const reqRef = ref(firebaseDb, `rooms/${roomId}/speakRequests`);

  const handler = onValue(reqRef, (snapshot) => {
    const requests: SpeakRequest[] = [];
    const data = snapshot.val();
    if (data) {
      for (const entry of Object.values(data as Record<string, any>)) {
        if (entry?.pubkey) requests.push(entry as SpeakRequest);
      }
    }
    onRequests(requests.filter((r) => r.status === "pending"));
  });

  return () => off(reqRef, "value", handler);
}

export async function setMeetingEnded(roomId: string): Promise<void> {
  const statusRef = ref(firebaseDb, `rooms/${roomId}/meetingEnded`);
  await set(statusRef, { ended: true, endedAt: Date.now() });
}

export function subscribeMeetingEnded(
  roomId: string,
  joinedAt: number,
  onEnded: () => void
): () => void {
  const statusRef = ref(firebaseDb, `rooms/${roomId}/meetingEnded`);
  const handler = onValue(statusRef, (snapshot) => {
    const data = snapshot.val();
    if (data?.ended && data.endedAt > joinedAt) {
      onEnded();
    }
  });
  return () => off(statusRef, "value", handler);
}

export function subscribeMySpeakRequest(
  roomId: string,
  pubkey: string,
  onStatus: (status: SpeakRequestStatus | null) => void
): () => void {
  const reqRef = ref(firebaseDb, `rooms/${roomId}/speakRequests/${pubkey}`);

  const handler = onValue(reqRef, (snapshot) => {
    const data = snapshot.val();
    onStatus(data?.status ?? null);
  });

  return () => off(reqRef, "value", handler);
}
