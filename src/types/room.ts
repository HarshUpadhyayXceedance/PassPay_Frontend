export interface CommunityRoom {
  id: string;
  creator: string;
  title: string;
  type: "public" | "ticket";
  eventPda?: string;
  isSeekerGated?: boolean;
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
  isSeekerGated?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: string;
  senderFull?: string;
  text: string;
  timestamp: number;
}
