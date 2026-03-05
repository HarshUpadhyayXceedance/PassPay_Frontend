export interface CommunityRoom {
  id: string;
  creator: string;
  title: string;
  type: "public" | "ticket";
  eventPda?: string;
  livekitRoom: string;
  maxParticipants: number;
  createdAt: number;
  expiresAt: number;
  participantCount?: number;
}

export interface JoinRoomResult {
  room: CommunityRoom;
  token: string | null;
  livekitUrl: string | null;
  role: "speaker" | "listener";
}

export interface CreateRoomBody {
  title: string;
  maxParticipants?: number;
}

export interface ChatMessage {
  id: string;
  sender: string; // shortened wallet address (display name)
  senderFull?: string; // full wallet address (used to detect own messages)
  text: string;
  timestamp: number;
}
