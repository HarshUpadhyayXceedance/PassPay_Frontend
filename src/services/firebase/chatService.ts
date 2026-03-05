/**
 * Firebase Realtime Database — Room Chat + Presence + Speak Requests
 *
 * Database paths:
 *   /rooms/{roomId}/messages/{pushId}      — chat messages
 *   /rooms/{roomId}/names/{pubkey}         — participant display names
 *   /rooms/{roomId}/speakRequests/{pubkey} — speak request status (meetings)
 *
 * Security Rules (paste in Firebase Console → Realtime Database → Rules):
 * {
 *   "rules": {
 *     "rooms": {
 *       "$roomId": {
 *         "messages": {
 *           ".read": true,
 *           ".write": true,
 *           ".indexOn": ["timestamp"]
 *         },
 *         "names": { ".read": true, ".write": true },
 *         "speakRequests": { ".read": true, ".write": true }
 *       }
 *     }
 *   }
 * }
 */

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

// ─── Chat ────────────────────────────────────────────────────────────────────

/** Push a new message to a room's chat. */
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

/**
 * Subscribe to new messages in a room.
 * @returns unsubscribe function
 */
export function subscribeRoomMessages(
  roomId: string,
  onMessage: (msg: ChatMessage) => void,
  onError?: (err: Error) => void
): () => void {
  const messagesRef = query(
    ref(firebaseDb, `rooms/${roomId}/messages`),
    orderByChild("timestamp"),
    limitToLast(100)
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

// ─── Participant Names ────────────────────────────────────────────────────────

/** Write the display name for a participant when they enter a room. */
export async function writeParticipantName(
  roomId: string,
  pubkey: string,
  name: string
): Promise<void> {
  const nameRef = ref(firebaseDb, `rooms/${roomId}/names/${pubkey}`);
  await set(nameRef, { name, pubkey });
}

/** Remove a participant's name entry when they leave. */
export async function removeParticipantName(
  roomId: string,
  pubkey: string
): Promise<void> {
  const nameRef = ref(firebaseDb, `rooms/${roomId}/names/${pubkey}`);
  await remove(nameRef);
}

/**
 * Subscribe to all participant display names in a room.
 * Callback receives { pubkey → displayName } map.
 * @returns unsubscribe function
 */
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

// ─── Speak Requests (meeting rooms only) ─────────────────────────────────────

export type SpeakRequestStatus = "pending" | "approved" | "denied";

export interface SpeakRequest {
  pubkey: string;
  name: string;
  requestedAt: number;
  status: SpeakRequestStatus;
}

/** Attendee: submit a request to speak. */
export async function writeSpeakRequest(
  roomId: string,
  pubkey: string,
  name: string
): Promise<void> {
  const reqRef = ref(firebaseDb, `rooms/${roomId}/speakRequests/${pubkey}`);
  await set(reqRef, { pubkey, name, requestedAt: Date.now(), status: "pending" });
}

/** Admin: update speak request status (approve / deny). */
export async function updateSpeakRequestStatus(
  roomId: string,
  pubkey: string,
  status: SpeakRequestStatus,
  name?: string
): Promise<void> {
  const reqRef = ref(firebaseDb, `rooms/${roomId}/speakRequests/${pubkey}`);
  await set(reqRef, { pubkey, name: name ?? "", status, updatedAt: Date.now() });
}

/** Remove speak request once actioned. */
export async function removeSpeakRequest(
  roomId: string,
  pubkey: string
): Promise<void> {
  const reqRef = ref(firebaseDb, `rooms/${roomId}/speakRequests/${pubkey}`);
  await remove(reqRef);
}

/**
 * Admin: subscribe to all pending speak requests in a room.
 * @returns unsubscribe function
 */
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

// ─── Meeting Ended Signal ─────────────────────────────────────────────────────

/**
 * Admin: signal that the meeting has ended.
 * Stores { ended: true, endedAt: timestamp } so clients can distinguish
 * a current "end" event from a stale flag left over from a previous session.
 */
export async function setMeetingEnded(roomId: string): Promise<void> {
  const statusRef = ref(firebaseDb, `rooms/${roomId}/meetingEnded`);
  await set(statusRef, { ended: true, endedAt: Date.now() });
}

/**
 * All participants: subscribe to the meeting-ended signal.
 * `joinedAt` is the timestamp of when this client joined the room — signals
 * older than this are from a previous session and are ignored.
 * @returns unsubscribe function
 */
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

/**
 * Attendee: watch MY OWN speak request status.
 * @returns unsubscribe function
 */
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
