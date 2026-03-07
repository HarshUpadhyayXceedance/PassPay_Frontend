import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
  PermissionsAndroid,
  Alert,
  AppState,
  BackHandler,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing, borderRadius } from "../../theme/spacing";
import { showError, showInfo, showSuccess } from "../../utils/alerts";
import { useRooms } from "../../hooks/useRooms";
import { apiRevokeSpeak } from "../../services/api/roomApi";
import { ChatMessage } from "../../types/room";
import { useWalletStore } from "../../store/walletStore";
import {
  sendFirebaseMessage,
  subscribeRoomMessages,
  writeParticipantName,
  removeParticipantName,
  subscribeParticipantNames,
  writeSpeakRequest,
  updateSpeakRequestStatus,
  removeSpeakRequest,
  subscribeSpeakRequests,
  subscribeMySpeakRequest,
  setMeetingEnded,
  subscribeMeetingEnded,
  SpeakRequest,
  SpeakRequestStatus,
} from "../../services/firebase/chatService";

// LiveKit requires a dev build — not available in Expo Go
let Room: any = null;
let RoomEvent: any = null;
let AudioSession: any = null;
let VideoTrackComponent: any = null;
let TrackEnum: any = null;

try {
  const lk = require("livekit-client");
  Room = lk.Room;
  RoomEvent = lk.RoomEvent;
  TrackEnum = lk.Track;
  const lkRn = require("@livekit/react-native");
  AudioSession = lkRn.AudioSession;
  VideoTrackComponent = lkRn.VideoTrack;
  if (lkRn.registerGlobals) lkRn.registerGlobals();
} catch {
  // Running in Expo Go — native module unavailable
}

const LIVEKIT_NATIVE_AVAILABLE = !!(Room && AudioSession);

const AVATAR_COLORS = ["#6C63FF", "#FF6B6B", "#FF8C00", "#00B4D8", "#9B59B6", "#2ECC71", "#E67E22"];
function getAvatarColor(identity: string): string {
  let sum = 0;
  for (let i = 0; i < identity.length; i++) sum += identity.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function getInitial(name: string): string {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed[0].toUpperCase();
}

function shortenAddress(addr: string): string {
  if (!addr || addr.length <= 10) return addr ?? "Unknown";
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "Microphone Permission",
        message: "PassPay needs access to your microphone to speak in this room.",
        buttonPositive: "Allow",
        buttonNegative: "Deny",
      }
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: "Camera Permission",
        message: "PassPay needs access to your camera for video in this meeting.",
        buttonPositive: "Allow",
        buttonNegative: "Deny",
      }
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

// trackPublication optional: camera tracks cache the pub; screen share resolves live from room at render time
interface VideoTrackInfo {
  identity: string;
  trackPublication?: any;
  source: string; // "camera" | "screen_share"
}

export function RoomScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);
  const params = useLocalSearchParams<Record<string, string>>();
  const { publicKey } = useWalletStore();
  const { leaveRoom, requestSpeak, endMeeting } = useRooms();

  const roomId = params.roomId ?? "";
  const title = params.title ?? "Room";
  const token = params.token ?? "";
  const livekitUrl = params.livekitUrl ?? "";
  const initialRole = (params.role ?? "speaker") as "speaker" | "listener";
  const eventPda = params.eventPda;

  const eventDateMs = params.eventDate ? parseInt(params.eventDate, 10) : 0;
  const paramDisplayName = params.displayName ?? "";
  // Changes each join so cached tab component can detect and reset state
  const joinTimestamp = params.joinTimestamp ?? "0";
  const hostPubkey = params.hostPubkey ?? "";

  const isMeeting = !!eventPda;

  const { width: screenWidth } = useWindowDimensions();
  const tileHalfStyle = { width: (screenWidth - 16) / 2, height: ((screenWidth - 16) / 2) * 0.75 };

  const [nameModalVisible, setNameModalVisible] = useState(!paramDisplayName);
  const [nameInput, setNameInput] = useState(paramDisplayName);
  const [displayName, setDisplayName] = useState(paramDisplayName);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [livekitUnavailable, setLivekitUnavailable] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);

  const [participantCount, setParticipantCount] = useState(1);
  const [remoteIdentities, setRemoteIdentities] = useState<string[]>([]);
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const [activeSpeakers, setActiveSpeakers] = useState<Set<string>>(new Set());
  const [showParticipants, setShowParticipants] = useState(false);
  const [hostLeft, setHostLeft] = useState(false);

  const [isMicOn, setIsMicOn] = useState(initialRole === "speaker");
  const [role, setRole] = useState<"speaker" | "listener">(initialRole);
  // Ref so the Reconnected handler can read current mic state without stale closure
  const isMicOnRef = useRef(initialRole === "speaker");
  useEffect(() => { isMicOnRef.current = isMicOn; }, [isMicOn]);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isCameraFront, setIsCameraFront] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const isCameraOnRef = useRef(false);
  useEffect(() => { isCameraOnRef.current = isCameraOn; }, [isCameraOn]);
  // Updated via LiveKit events (not render-time lookup) to avoid stale pub refs
  const [localCameraPub, setLocalCameraPub] = useState<any>(null);
  const [localScreenSharePub, setLocalScreenSharePub] = useState<any>(null);
  const [remoteVideoTracks, setRemoteVideoTracks] = useState<VideoTrackInfo[]>([]);
  const [remoteScreenShare, setRemoteScreenShare] = useState<VideoTrackInfo | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [inputText, setInputText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const [speakRequestStatus, setSpeakRequestStatus] = useState<SpeakRequestStatus | null>(null);
  const [pendingSpeakRequests, setPendingSpeakRequests] = useState<SpeakRequest[]>([]);
  const [isUpgradingToSpeaker, setIsUpgradingToSpeaker] = useState(false);

  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
  // Prevents subscribeMeetingEnded callback from double-navigating when admin is already handling the end flow
  const isEndingMeetingRef = useRef(false);

  const roomRef = useRef<any>(null);
  const chatListRef = useRef<FlatList>(null);
  const showChatRef = useRef(false);
  const chatUnsubRef = useRef<(() => void) | null>(null);
  const seenMessageIds = useRef<Set<string>>(new Set());
  const prevSpeakRequestCount = useRef(0);
  const nameConfirmed = useRef(!!paramDisplayName);
  // Filters stale meetingEnded Firebase signals from previous sessions
  const joinedAtRef = useRef(Date.now());
  const prevJoinTimestampRef = useRef(joinTimestamp);
  // True while MWA is in progress — AppState listener uses this to auto-navigate back to room when Android restores a different screen
  const mwaInProgressRef = useRef(false);

  useEffect(() => {
    showChatRef.current = showChat;
  }, [showChat]);

  // When Phantom opens for MWA signing, Android may restore a different tab on return.
  // Detect foreground resume while MWA was in progress and navigate back to the room.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && mwaInProgressRef.current) {
        mwaInProgressRef.current = false;
        // Small delay to let navigation stack settle after app resume
        setTimeout(() => {
          const isOnRoom = pathnameRef.current.includes("/room");
          if (!isOnRoom) {
            const roomPath = initialRole === "speaker" ? "/(admin)/room" : "/(user)/room";
            router.push({
              pathname: roomPath as any,
              params: {
                roomId,
                title,
                token,
                livekitUrl,
                role: initialRole,
                eventPda: eventPda ?? "",
                ticketMint: params.ticketMint ?? "",
                isAlreadyCheckedIn: params.isAlreadyCheckedIn ?? "false",
                eventDate: String(eventDateMs),
                joinTimestamp, // same timestamp so re-join won't reset state again
              },
            });
          }
        }, 300);
      }
    });
    return () => subscription.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, title, token, livekitUrl, initialRole, eventPda, eventDateMs, joinTimestamp]);

  // expo-router caches tab screen components so useState initializers don't re-run on rejoin.
  // Detect fresh join via joinTimestamp and manually reset transient state.
  useEffect(() => {
    if (joinTimestamp === prevJoinTimestampRef.current) return;
    prevJoinTimestampRef.current = joinTimestamp;

    joinedAtRef.current = Date.now();
    isEndingMeetingRef.current = false;

    setNameModalVisible(!paramDisplayName);
    nameConfirmed.current = !!paramDisplayName;
    setDisplayName(paramDisplayName);
    setNameInput(paramDisplayName);
    setMessages([]);
    setUnreadCount(0);
    seenMessageIds.current = new Set();
    prevSpeakRequestCount.current = 0;
    setSpeakRequestStatus(null);
    setPendingSpeakRequests([]);
    setIsUpgradingToSpeaker(false);
    setIsEndingMeeting(false);
    setRemoteIdentities([]);
    setActiveSpeakers(new Set());
    setParticipantCount(1);
    setIsConnected(false);
    setIsConnecting(true);
    setConnectionFailed(false);
    setLivekitUnavailable(false);
    setRole(initialRole);
    const micDefault = initialRole === "speaker";
    setIsMicOn(micDefault);
    isMicOnRef.current = micDefault;
    setShowParticipants(false);
    setShowChat(false);
    setInputText("");
    setIsCameraOn(false);
    isCameraOnRef.current = false;
    setIsCameraFront(true);
    setIsScreenSharing(false);
    setLocalCameraPub(null);
    setLocalScreenSharePub(null);
    setRemoteVideoTracks([]);
    setRemoteScreenShare(null);
    setHostLeft(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinTimestamp]);

  const handleNameConfirm = useCallback(() => {
    const name = nameInput.trim() || shortenAddress(publicKey ?? "Me");
    setDisplayName(name);
    setNameModalVisible(false);
    nameConfirmed.current = true;
    if (publicKey && roomId) {
      writeParticipantName(roomId, publicKey, name).catch(() => {});
    }
  }, [nameInput, publicKey, roomId]);

  useEffect(() => {
    chatUnsubRef.current?.();
    chatUnsubRef.current = null;

    if (!roomId) return;

    const unsub = subscribeRoomMessages(
      roomId,
      (msg) => {
        if (seenMessageIds.current.has(msg.id)) return;
        seenMessageIds.current.add(msg.id);
        setMessages((prev) => [...prev, msg]);
        if (!showChatRef.current) setUnreadCount((n) => n + 1);
        setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
      },
      (err) => console.warn("[Chat] Firebase error:", err.message)
    );
    chatUnsubRef.current = unsub;

    return () => {
      unsub();
      chatUnsubRef.current = null;
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    const unsub = subscribeParticipantNames(roomId, setParticipantNames);
    return unsub;
  }, [roomId]);

  // joinTimestamp ensures write re-fires on rejoin even with same name+room
  useEffect(() => {
    if (paramDisplayName && publicKey && roomId) {
      writeParticipantName(roomId, publicKey, paramDisplayName).catch(() => {});
    }
  }, [paramDisplayName, publicKey, roomId, joinTimestamp]);

  useEffect(() => {
    if (!roomId || !isMeeting || initialRole !== "speaker") return;
    const unsub = subscribeSpeakRequests(roomId, setPendingSpeakRequests);
    return unsub;
  }, [roomId, isMeeting, initialRole]);

  useEffect(() => {
    if (!isMeeting || initialRole !== "speaker") return;
    const curr = pendingSpeakRequests.length;
    const prev = prevSpeakRequestCount.current;
    if (curr > prev) {
      const newest = pendingSpeakRequests[curr - 1];
      const name = newest?.name || "Someone";
      showInfo("Speak Request", `${name} wants to speak. Opening participants…`);
      setShowParticipants(true);
    }
    prevSpeakRequestCount.current = curr;
  }, [pendingSpeakRequests, isMeeting, initialRole]);

  useEffect(() => {
    if (!roomId || !isMeeting || !publicKey || initialRole !== "listener") return;
    const unsub = subscribeMySpeakRequest(roomId, publicKey, (status) => {
      setSpeakRequestStatus(status);
      if (status === "approved") {
        handleSpeakerUpgrade();
      }
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, isMeeting, publicKey, initialRole]);

  useEffect(() => {
    if (!roomId || !isMeeting) return;
    const unsub = subscribeMeetingEnded(roomId, joinedAtRef.current, () => {
      if (isEndingMeetingRef.current) return; // admin already handles its own navigation
      roomRef.current?.disconnect();
      if (publicKey && roomId) removeParticipantName(roomId, publicKey).catch(() => {});
      showInfo("Meeting Ended", "The host has ended this meeting.");
      router.back();
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, isMeeting]);

  useEffect(() => {
    if (nameModalVisible) return; // wait for name entry before connecting

    if (!LIVEKIT_NATIVE_AVAILABLE) {
      setLivekitUnavailable(true);
      setIsConnecting(false);
      return;
    }
    if (!token || !livekitUrl) {
      setLivekitUnavailable(true);
      setIsConnecting(false);
      return;
    }

    const lkRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      reconnectPolicy: { maxRetries: 5, minDelay: 500, maxDelay: 8000, multiplier: 1.5 },
    });
    roomRef.current = lkRoom;

    const updateParticipants = () => {
      const remoteCount = lkRoom.remoteParticipants?.size ?? 0;
      setParticipantCount(remoteCount + 1);
      const identities = Array.from(lkRoom.remoteParticipants?.values() ?? []).map(
        (p: any) => p.identity as string
      );
      setRemoteIdentities(identities);
    };

    lkRoom.on(RoomEvent.Connected, () => {
      setIsConnected(true);
      setIsConnecting(false);
      updateParticipants();
      if (initialRole === "speaker") {
        requestMicPermission().then((granted) => {
          if (granted) lkRoom.localParticipant.setMicrophoneEnabled(true).catch(() => {});
        });
      }
    });

    lkRoom.on(RoomEvent.Disconnected, () => setIsConnected(false));
    lkRoom.on(RoomEvent.ParticipantConnected, updateParticipants);
    lkRoom.on(RoomEvent.ParticipantDisconnected, (participant: any) => {
      updateParticipants();
      if (isMeeting && hostPubkey && participant.identity === hostPubkey) {
        setHostLeft(true);
      }
    });

    lkRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers: any[]) => {
      setActiveSpeakers(new Set(speakers.map((s: any) => s.identity)));
    });

    lkRoom.on(RoomEvent.Reconnected, () => {
      setIsConnected(true);
      updateParticipants();
      if (isMicOnRef.current) {
        lkRoom.localParticipant.setMicrophoneEnabled(true).catch(() => {});
      }
      if (isCameraOnRef.current) {
        lkRoom.localParticipant.setCameraEnabled(true).catch(() => {});
      }
    });

    lkRoom.on(RoomEvent.LocalParticipantPermissionsChanged, () => {
      const canPublish = lkRoom.localParticipant?.permissions?.canPublish ?? false;
      if (!canPublish) {
        setRole("listener");
        setIsMicOn(false);
        isMicOnRef.current = false;
        setIsCameraOn(false);
        isCameraOnRef.current = false;
        setSpeakRequestStatus(null);
      }
    });

    if (isMeeting && TrackEnum) {
      lkRoom.on(RoomEvent.TrackSubscribed, (track: any, publication: any, participant: any) => {
        if (track.source === TrackEnum.Source.Camera) {
          if (publication.isMuted) return;
          setRemoteVideoTracks((prev) => {
            if (prev.some((t) => t.identity === participant.identity && t.source === "camera")) return prev;
            return [...prev, { identity: participant.identity, trackPublication: publication, source: "camera" }];
          });
        } else if (track.source === TrackEnum.Source.ScreenShare) {
          // 500ms delay lets the track's mediaStream initialize before rendering (slower on Android)
          setTimeout(() => {
            setRemoteScreenShare({ identity: participant.identity, trackPublication: publication, source: "screen_share" });
          }, 500);
        }
      });

      lkRoom.on(RoomEvent.TrackUnsubscribed, (track: any, _pub: any, participant: any) => {
        if (track.source === TrackEnum.Source.Camera) {
          setRemoteVideoTracks((prev) => prev.filter((t) => !(t.identity === participant.identity && t.source === "camera")));
        } else if (track.source === TrackEnum.Source.ScreenShare) {
          setRemoteScreenShare((prev) => prev?.identity === participant.identity ? null : prev);
        }
      });

      lkRoom.on(RoomEvent.TrackMuted, (publication: any, participant: any) => {
        if (publication?.source === TrackEnum.Source.Camera) {
          setRemoteVideoTracks((prev) => prev.filter((t) => !(t.identity === participant.identity && t.source === "camera")));
        } else if (publication?.source === TrackEnum.Source.ScreenShare) {
          setRemoteScreenShare((prev) => prev?.identity === participant.identity ? null : prev);
        }
      });

      lkRoom.on(RoomEvent.TrackUnmuted, (publication: any, participant: any) => {
        if (publication?.source === TrackEnum.Source.Camera) {
          setRemoteVideoTracks((prev) => {
            if (prev.some((t) => t.identity === participant.identity && t.source === "camera")) return prev;
            return [...prev, { identity: participant.identity, trackPublication: publication, source: "camera" }];
          });
        }
      });
    }

    if (isMeeting && TrackEnum) {
      lkRoom.on(RoomEvent.LocalTrackPublished, (publication: any) => {
        if (publication?.source === TrackEnum.Source.Camera) {
          setLocalCameraPub(publication);
        } else if (publication?.source === TrackEnum.Source.ScreenShare) {
          // 500ms delay for track mediaStream initialization (slower on Android)
          setTimeout(() => setLocalScreenSharePub(publication), 500);
        }
      });
      lkRoom.on(RoomEvent.LocalTrackUnpublished, (publication: any) => {
        if (publication?.source === TrackEnum.Source.Camera) {
          setLocalCameraPub(null);
        } else if (publication?.source === TrackEnum.Source.ScreenShare) {
          setLocalScreenSharePub(null);
        }
      });
    }

    AudioSession.startAudioSession().then(() => {
      lkRoom.connect(livekitUrl, token).catch((err: any) => {
        console.warn("LiveKit connect error:", err?.message);
        setConnectionFailed(true);
        setIsConnecting(false);
      });
    });

    return () => {
      lkRoom.disconnect();
      AudioSession?.stopAudioSession();
    };
  }, [token, livekitUrl, nameModalVisible, joinTimestamp]);

  const toggleMic = useCallback(async () => {
    const lkRoom = roomRef.current;
    if (!lkRoom) return;
    const next = !isMicOn;
    if (next) {
      const granted = await requestMicPermission();
      if (!granted) {
        showError("Permission Denied", "Microphone permission is required to speak.");
        return;
      }
    }
    try {
      await lkRoom.localParticipant.setMicrophoneEnabled(next);
      setIsMicOn(next);
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (msg.toLowerCase().includes("insufficient permissions") || msg.toLowerCase().includes("publish")) {
        setRole("listener");
        setIsMicOn(false);
        isMicOnRef.current = false;
        setSpeakRequestStatus(null);
      } else {
        showError("Mic Error", msg || "Could not toggle microphone.");
      }
    }
  }, [isMicOn]);

  const toggleCamera = useCallback(async () => {
    const lkRoom = roomRef.current;
    if (!lkRoom || !isMeeting) return;
    const next = !isCameraOn;
    if (next) {
      // Keep mwaInProgressRef=true for the full operation — both permission dialogs and camera enable
      // can briefly background the app on Android; clearing early leaves user stranded.
      mwaInProgressRef.current = true;
      const granted = await requestCameraPermission();
      if (!granted) {
        mwaInProgressRef.current = false;
        showError("Permission Denied", "Camera permission is required for video.");
        return;
      }
    }
    try {
      await lkRoom.localParticipant.setCameraEnabled(next, next ? { facingMode: isCameraFront ? "user" : "environment" } : undefined);
      setIsCameraOn(next);
      isCameraOnRef.current = next;
      if (!next) setLocalCameraPub(null);
    } catch (err: any) {
      showError("Camera Error", err.message ?? "Could not toggle camera.");
    } finally {
      // Delayed clear gives AppState handler time to fire first if app was backgrounded
      setTimeout(() => { mwaInProgressRef.current = false; }, 1000);
    }
  }, [isCameraOn, isCameraFront, isMeeting]);

  const flipCamera = useCallback(async () => {
    const lkRoom = roomRef.current;
    if (!lkRoom || !isCameraOn) return;
    const newFront = !isCameraFront;
    try {
      const camPub = lkRoom.localParticipant.getTrackPublication(TrackEnum?.Source?.Camera);
      if (camPub?.track) {
        // Try restartTrack first (seamless switch)
        try {
          await camPub.track.restartTrack({ facingMode: newFront ? "user" : "environment" });
          setIsCameraFront(newFront);
          return;
        } catch {
          // restartTrack failed — fall through to disable/re-enable fallback
        }
      }
      await lkRoom.localParticipant.setCameraEnabled(false);
      // Small delay lets the track fully release before re-enable
      await new Promise<void>((r) => setTimeout(r, 300));
      await lkRoom.localParticipant.setCameraEnabled(true, { facingMode: newFront ? "user" : "environment" });
      setIsCameraFront(newFront);
    } catch (err: any) {
      showError("Camera Error", err.message ?? "Could not flip camera.");
    }
  }, [isCameraOn, isCameraFront]);

  const toggleScreenShare = useCallback(async () => {
    const lkRoom = roomRef.current;
    if (!lkRoom || !isMeeting) return;
    const next = !isScreenSharing;
    if (next) {
      // Android MediaProjection dialog briefly backgrounds the app — flag so AppState handler can navigate back
      mwaInProgressRef.current = true;
    }
    try {
      await lkRoom.localParticipant.setScreenShareEnabled(next);
      setIsScreenSharing(next);
    } catch (err: any) {
      if (next) {
        showError("Screen Share", err.message ?? "Could not start screen sharing.");
      }
    } finally {
      // Delayed clear gives AppState handler time to fire first if app was backgrounded
      setTimeout(() => { mwaInProgressRef.current = false; }, 1000);
    }
  }, [isScreenSharing, isMeeting]);

  const handleRequestSpeak = useCallback(async () => {
    if (!publicKey || !roomId) return;
    const name = displayName || shortenAddress(publicKey);
    setSpeakRequestStatus("pending");
    try {
      await writeSpeakRequest(roomId, publicKey, name);
      showInfo("Request Sent", "Your request to speak has been sent to the host.");
    } catch (err: any) {
      setSpeakRequestStatus(null);
      console.error("[Speak Request] Firebase write failed:", err?.message ?? err);
      showError("Request Failed", "Could not send speak request. Try again.");
    }
  }, [publicKey, roomId, displayName]);

  const handleApproveSpeak = useCallback(async (req: SpeakRequest) => {
    if (!roomId) return;
    try {
      await updateSpeakRequestStatus(roomId, req.pubkey, "approved", req.name);
      showSuccess("Approved", `${req.name} can now speak.`);
    } catch {
      showError("Failed", "Could not approve request.");
    }
  }, [roomId]);

  const handleDenySpeak = useCallback(async (req: SpeakRequest) => {
    if (!roomId) return;
    try {
      await updateSpeakRequestStatus(roomId, req.pubkey, "denied", req.name);
    } catch {}
  }, [roomId]);

  const handleRevokeSpeak = useCallback(async (identity: string) => {
    if (!eventPda || !publicKey) return;
    const name = participantNames[identity] || shortenAddress(identity);
    Alert.alert("Revoke Speaker", `Remove speaking permission from ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revoke",
        style: "destructive",
        onPress: async () => {
          try {
            await apiRevokeSpeak(eventPda, identity, publicKey);
            showSuccess("Revoked", `${name} can no longer speak.`);
          } catch {
            showError("Failed", "Could not revoke speaking access.");
          }
        },
      },
    ]);
  }, [eventPda, publicKey, participantNames]);

  const handleSpeakerUpgrade = useCallback(async () => {
    if (!eventPda || !publicKey || isUpgradingToSpeaker) return;
    setIsUpgradingToSpeaker(true);
    // Hold mwaInProgressRef for the entire upgrade — the network call or LiveKit's mic-enable
    // can briefly restore a different Android screen, which would trigger AppState navigation.
    mwaInProgressRef.current = true;
    try {
      // Backend grants canPublish=true via RoomServiceClient — no LiveKit disconnect/reconnect needed
      await requestSpeak(eventPda);
      // Wait for canPublish permission to propagate to the LiveKit client
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      const lkRoom = roomRef.current;
      if (lkRoom) {
        // Enable mic via LiveKit — its native layer handles Android permission internally,
        // avoiding an explicit PermissionsAndroid dialog that would trigger AppState issues.
        await lkRoom.localParticipant.setMicrophoneEnabled(true).catch(() => {});
        setRole("speaker");
        setIsMicOn(true);
        isMicOnRef.current = true;
      }
      if (publicKey && roomId) await removeSpeakRequest(roomId, publicKey).catch(() => {});
      showSuccess("Mic Granted!", "You can now speak. Your mic is on.");
    } catch (err: any) {
      showError("Upgrade Failed", err.message ?? "Could not enable your mic.");
    } finally {
      setTimeout(() => { mwaInProgressRef.current = false; }, 1000);
      setIsUpgradingToSpeaker(false);
    }
  }, [eventPda, publicKey, requestSpeak, roomId, isUpgradingToSpeaker]);

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !roomId) return;
    const senderDisplay = displayName || shortenAddress(publicKey ?? "Me");
    try {
      await sendFirebaseMessage(roomId, senderDisplay, publicKey ?? "", text);
    } catch (e) {
      console.warn("[Chat] send failed:", e);
    }
    setInputText("");
  }, [inputText, publicKey, roomId, displayName]);

  const handleLeave = useCallback(async () => {
    try {
      roomRef.current?.disconnect();
      if (publicKey && roomId) {
        await removeParticipantName(roomId, publicKey).catch(() => {});
        // Remove pending speak request so admin's panel doesn't show stale request after user leaves
        if (isMeeting && speakRequestStatus === "pending") {
          await removeSpeakRequest(roomId, publicKey).catch(() => {});
        }
        if (!isMeeting) await leaveRoom(roomId).catch(() => {});
      }
    } finally {
      router.back();
    }
  }, [isMeeting, roomId, publicKey, leaveRoom, router, speakRequestStatus]);

  // Run full cleanup instead of raw router.back() to disconnect LiveKit and remove Firebase presence
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleLeave();
      return true;
    });
    return () => sub.remove();
  }, [handleLeave]);

  const handleEndMeeting = useCallback(() => {
    if (!eventPda) return;
    Alert.alert(
      "End Meeting",
      "This will close the meeting for all participants. No one will be able to rejoin. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Meeting",
          style: "destructive",
          onPress: async () => {
            isEndingMeetingRef.current = true;
            setIsEndingMeeting(true);
            try {
              // Signal clients via Firebase BEFORE deleting so they can react before being kicked
              await setMeetingEnded(roomId);
              await endMeeting(eventPda);
              roomRef.current?.disconnect();
              if (publicKey && roomId) {
                await removeParticipantName(roomId, publicKey).catch(() => {});
              }
              router.back();
            } catch (err: any) {
              isEndingMeetingRef.current = false;
              setIsEndingMeeting(false);
              Alert.alert("Error", err?.message ?? "Failed to end meeting. Try again.");
            }
          },
        },
      ]
    );
  }, [eventPda, endMeeting, roomId, publicKey, router]);

  const toggleChat = useCallback(() => {
    setShowChat((prev) => {
      if (!prev) setUnreadCount(0);
      return !prev;
    });
  }, []);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isOwn = !!publicKey && item.senderFull === publicKey;
      return (
        <View style={[styles.msgRow, isOwn && styles.msgRowSelf]}>
          <View style={[styles.msgBubble, isOwn && styles.msgBubbleSelf]}>
            {!isOwn && <Text style={styles.msgSender}>{item.sender}</Text>}
            <Text style={[styles.msgText, isOwn && styles.msgTextSelf]}>{item.text}</Text>
          </View>
        </View>
      );
    },
    [publicKey]
  );

  const getStageStatus = (): string => {
    if (livekitUnavailable) return "Audio not available — text chat only";
    if (connectionFailed) return "Audio connection failed — text chat only";
    if (!isConnected) return "Connecting...";
    if (isMicOn) return "Mic On — You're speaking";
    if (role === "speaker") return "Mic Off";
    return "Listening...";
  };

  const localIdentity = publicKey ?? "";
  const localDisplayName = displayName || shortenAddress(localIdentity);
  const isAdminInMeeting = isMeeting && initialRole === "speaker";

  const hasLocalCamera = isCameraOn && !!localCameraPub;
  const hasAnyVideo = isMeeting && (hasLocalCamera || remoteVideoTracks.length > 0 || remoteScreenShare !== null || isScreenSharing);

  const renderVideoTile = (
    trackPublication: any,
    identity: string,
    isLocal: boolean,
    name: string,
    tileStyle: any
  ) => {
    if (!VideoTrackComponent) return null;
    // For remote participants, get live publication from the room to avoid stale cached refs
    const livePub = isLocal
      ? trackPublication
      : roomRef.current?.remoteParticipants?.get(identity)?.getTrackPublication?.(TrackEnum?.Source?.Camera) ?? trackPublication;
    if (!livePub || livePub.isMuted) return null;
    const trackRef = {
      participant: isLocal
        ? roomRef.current?.localParticipant
        : roomRef.current?.remoteParticipants?.get(identity) ?? null,
      publication: livePub,
      source: TrackEnum?.Source?.Camera,
    };
    return (
      <View key={identity} style={[styles.videoTile, tileStyle]}>
        <VideoTrackComponent
          trackRef={trackRef}
          style={styles.videoTrackFill}
          objectFit="cover"
          mirror={isLocal && isCameraFront}
        />
        <View style={styles.videoNameOverlay}>
          <Text style={styles.videoNameText} numberOfLines={1}>{isLocal ? "You" : name}</Text>
          {activeSpeakers.has(identity) && (
            <Ionicons name="mic" size={12} color="#00FFA3" style={{ marginLeft: 4 }} />
          )}
        </View>
        {isLocal && isCameraOn && (
          <TouchableOpacity style={styles.cameraFlipBtn} onPress={flipCamera}>
            <Ionicons name="camera-reverse-outline" size={16} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (nameModalVisible) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.nameModalWrapper}>
          <View style={styles.nameModalCard}>
            <Ionicons name={isMeeting ? "videocam-outline" : "mic-outline"} size={40} color={colors.primary} style={{ marginBottom: 12 }} />
            <Text style={styles.nameModalTitle}>What's your name?</Text>
            <Text style={styles.nameModalSub}>This will be shown to other participants in the room.</Text>
            <TextInput
              style={styles.nameModalInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Your display name"
              placeholderTextColor={colors.textMuted}
              autoFocus
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={handleNameConfirm}
            />
            <TouchableOpacity style={styles.nameModalBtn} onPress={handleNameConfirm}>
              <Text style={styles.nameModalBtnText}>Join Room</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
              <Text style={styles.nameModalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (isConnecting) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.connectingText}>Joining room...</Text>
          <TouchableOpacity style={styles.connectingLeaveBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={colors.textMuted} />
            <Text style={styles.connectingLeaveBtnText}>Leave</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {isMeeting ? (
            <View style={styles.meetingBadge}>
              <Text style={styles.meetingBadgeText}>MEETING</Text>
            </View>
          ) : (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.participantChip} onPress={() => setShowParticipants(true)} activeOpacity={0.7}>
            <Ionicons name="people" size={13} color={colors.primary} />
            <Text style={styles.participantChipText}>{participantCount}</Text>
            {isAdminInMeeting && pendingSpeakRequests.length > 0 && (
              <View style={styles.reqBadge}>
                <Text style={styles.reqBadgeText}>{pendingSpeakRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          {isAdminInMeeting && (
            <TouchableOpacity
              style={[styles.leaveBtn, styles.endMeetingBtn]}
              onPress={handleEndMeeting}
              disabled={isEndingMeeting}
            >
              <Text style={styles.leaveBtnText}>
                {isEndingMeeting ? "Ending..." : "End"}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
            <Text style={styles.leaveBtnText}>Leave</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Banners ── */}
      {livekitUnavailable && (
        <View style={styles.unavailableBanner}>
          <Ionicons name="warning-outline" size={16} color="#FFA502" />
          <Text style={styles.unavailableText}>
            Live audio requires a development build. Text chat still works.
          </Text>
        </View>
      )}
      {connectionFailed && !livekitUnavailable && (
        <View style={[styles.unavailableBanner, styles.errorBanner]}>
          <Ionicons name="warning-outline" size={16} color="#FF4757" />
          <Text style={[styles.unavailableText, { color: "#FF4757" }]}>
            Audio connection failed. Text chat still works.
          </Text>
        </View>
      )}


      {/* Host-left banner — shown to attendees when host disconnects without ending meeting */}
      {isMeeting && hostLeft && initialRole !== "speaker" && (
        <View style={styles.hostLeftBanner}>
          <Ionicons name="alert-circle-outline" size={15} color="#FFA502" />
          <Text style={styles.hostLeftText}>Host has left · Meeting continues until explicitly ended</Text>
          <TouchableOpacity onPress={() => setHostLeft(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={15} color="#FFA502" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Main area ── */}
      <View style={styles.main}>
        {/* ── Screen share view (takes priority when active) ── */}
        {isMeeting && (remoteScreenShare || isScreenSharing) && (
          <View style={styles.screenShareContainer}>
            <View style={styles.screenShareBanner}>
              <Ionicons name="desktop-outline" size={14} color={colors.primary} />
              <Text style={styles.screenShareBannerText}>
                {isScreenSharing
                  ? "You are sharing your screen"
                  : `${participantNames[remoteScreenShare!.identity] || shortenAddress(remoteScreenShare!.identity)} is sharing their screen`}
              </Text>
            </View>
            {isScreenSharing ? (
              <View style={styles.screenShareVideoWrap}>
                {localScreenSharePub && VideoTrackComponent ? (
                  <VideoTrackComponent
                    trackRef={{
                      participant: roomRef.current?.localParticipant,
                      publication: localScreenSharePub,
                      source: TrackEnum?.Source?.ScreenShare,
                    }}
                    style={styles.screenShareVideo}
                    objectFit="contain"
                  />
                ) : (
                  <View style={styles.screenSharePlaceholder}>
                    <Ionicons name="desktop-outline" size={48} color={colors.textMuted} />
                    <Text style={styles.screenSharePlaceholderText}>Your screen is being shared</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.stopShareOverlay} onPress={toggleScreenShare}>
                  <Ionicons name="stop-circle-outline" size={18} color="#FFF" />
                  <Text style={styles.stopShareBtnText}>Stop Sharing</Text>
                </TouchableOpacity>
              </View>
            ) : remoteScreenShare && VideoTrackComponent ? (() => {
              // Use stored publication from TrackSubscribed, with live lookup as fallback
              const ssParticipant = roomRef.current?.remoteParticipants?.get(remoteScreenShare.identity);
              const ssPub = ssParticipant?.getTrackPublication?.(TrackEnum?.Source?.ScreenShare) ?? remoteScreenShare.trackPublication;
              const ssParticipantRef = ssParticipant ?? (ssPub ? { identity: remoteScreenShare.identity } : null);
              if (!ssParticipantRef || !ssPub) return null;
              return (
                <VideoTrackComponent
                  trackRef={{
                    participant: ssParticipantRef,
                    publication: ssPub,
                    source: TrackEnum?.Source?.ScreenShare,
                  }}
                  style={styles.screenShareVideo}
                  objectFit="contain"
                />
              );
            })() : null}
          </View>
        )}

        {/* ── Video grid (meetings with cameras on) ── */}
        {isMeeting && hasAnyVideo && !(remoteScreenShare || isScreenSharing) ? (
          <View style={styles.videoGrid}>
            {/* Local camera */}
            {hasLocalCamera && renderVideoTile(
              localCameraPub,
              localIdentity,
              true,
              "You",
              remoteVideoTracks.length === 0 ? styles.videoTileFull : tileHalfStyle
            )}
            {/* Remote cameras */}
            {remoteVideoTracks.slice(0, hasLocalCamera ? 3 : 4).map((track) => {
              const name = participantNames[track.identity] || shortenAddress(track.identity);
              const totalTiles = (hasLocalCamera ? 1 : 0) + Math.min(remoteVideoTracks.length, hasLocalCamera ? 3 : 4);
              return renderVideoTile(
                track.trackPublication,
                track.identity,
                false,
                name,
                totalTiles <= 1 ? styles.videoTileFull : tileHalfStyle
              );
            })}
            {/* Overflow indicator */}
            {remoteVideoTracks.length > (hasLocalCamera ? 3 : 4) && (
              <View style={[styles.videoTile, tileHalfStyle, styles.videoTileOverflow]}>
                <Text style={styles.videoOverflowText}>+{remoteVideoTracks.length - (hasLocalCamera ? 3 : 4)}</Text>
                <Text style={styles.videoOverflowSub}>more with video</Text>
              </View>
            )}
          </View>
        ) : hasAnyVideo && (remoteScreenShare || isScreenSharing) ? (
          /* Small video tiles row below screen share */
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.miniVideoRow}>
            {hasLocalCamera && renderVideoTile(
              localCameraPub,
              localIdentity,
              true,
              "You",
              styles.videoTileMini
            )}
            {remoteVideoTracks.slice(0, 5).map((track) => {
              const name = participantNames[track.identity] || shortenAddress(track.identity);
              return renderVideoTile(track.trackPublication, track.identity, false, name, styles.videoTileMini);
            })}
          </ScrollView>
        ) : (
          /* ── Default: avatar stage (no videos) ── */
          <View style={styles.stage}>
            <Text style={styles.stageLabel}>{getStageStatus()}</Text>

            <View style={styles.avatarsRow}>
              {/* Local participant */}
              <View style={styles.avatarWrapper}>
                <View style={[
                  styles.avatar,
                  { backgroundColor: getAvatarColor(localIdentity) + "50" },
                  activeSpeakers.has(localIdentity) && styles.avatarSpeaking,
                ]}>
                  <Text style={[styles.avatarInitial, { color: getAvatarColor(localIdentity) }]}>
                    {getInitial(localDisplayName)}
                  </Text>
                </View>
                <Text style={styles.avatarLabel} numberOfLines={1}>You</Text>
              </View>

              {/* Remote participants */}
              {remoteIdentities.slice(0, 4).map((identity) => {
                const name = participantNames[identity] || shortenAddress(identity);
                const color = getAvatarColor(identity);
                const isSpeaking = activeSpeakers.has(identity);
                return (
                  <View key={identity} style={styles.avatarWrapper}>
                    <View style={[
                      styles.avatar,
                      { backgroundColor: color + "40" },
                      isSpeaking && styles.avatarSpeaking,
                      isSpeaking && { borderColor: colors.primary },
                    ]}>
                      <Text style={[styles.avatarInitial, { color }]}>
                        {getInitial(name)}
                      </Text>
                    </View>
                    <Text style={styles.avatarLabel} numberOfLines={1}>
                      {name.length > 8 ? name.slice(0, 7) + "…" : name}
                    </Text>
                  </View>
                );
              })}

              {remoteIdentities.length > 4 && (
                <View style={styles.avatarWrapper}>
                  <View style={[styles.avatar, styles.avatarOverflow]}>
                    <Text style={styles.avatarOverflowText}>+{remoteIdentities.length - 4}</Text>
                  </View>
                  <Text style={styles.avatarLabel}>more</Text>
                </View>
              )}
            </View>

            <Text style={styles.participantCountText}>
              {participantCount} participant{participantCount !== 1 ? "s" : ""}
            </Text>
          </View>
        )}

        {/* Chat */}
        {showChat && (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.chatContainer}
          >
            <FlatList
              ref={chatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.chatList}
              onContentSizeChange={() => chatListRef.current?.scrollToEnd({ animated: true })}
              ListEmptyComponent={
                <Text style={styles.chatEmpty}>No messages yet. Say hi!</Text>
              }
            />
            <View style={styles.inputRow}>
              <TextInput
                style={styles.chatInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type a message..."
                placeholderTextColor={colors.textMuted}
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                onPress={sendMessage}
                disabled={!inputText.trim()}
              >
                <Ionicons name="send" size={18} color={colors.background} />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>

      {/* ── Bottom controls ── */}
      <View style={styles.controls}>
        {/* Mic (speaker) OR Request to Speak (listener in meeting) */}
        {role === "speaker" && !livekitUnavailable && !connectionFailed ? (
          <TouchableOpacity
            style={[styles.controlBtn, isMicOn && styles.controlBtnActive]}
            onPress={toggleMic}
          >
            <Ionicons
              name={isMicOn ? "mic" : "mic-off"}
              size={22}
              color={isMicOn ? colors.background : colors.textMuted}
            />
          </TouchableOpacity>
        ) : isMeeting && role === "listener" && !livekitUnavailable && !connectionFailed ? (
          <TouchableOpacity
            style={[
              styles.controlBtn,
              speakRequestStatus === "pending" && styles.controlBtnPending,
              isUpgradingToSpeaker && styles.controlBtnActive,
            ]}
            onPress={speakRequestStatus === null ? handleRequestSpeak : undefined}
            disabled={speakRequestStatus === "pending" || isUpgradingToSpeaker}
          >
            {isUpgradingToSpeaker ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Ionicons
                name={speakRequestStatus === "pending" ? "time-outline" : "hand-left-outline"}
                size={22}
                color={speakRequestStatus === "pending" ? colors.primary : colors.textMuted}
              />
            )}
          </TouchableOpacity>
        ) : null}

        {/* Camera (initial meeting speakers / admin only — not for upgraded attendees) */}
        {isMeeting && initialRole === "speaker" && !livekitUnavailable && !connectionFailed && (
          <TouchableOpacity
            style={[styles.controlBtn, isCameraOn && styles.controlBtnActive]}
            onPress={toggleCamera}
          >
            <Ionicons
              name={isCameraOn ? "videocam" : "videocam-off"}
              size={22}
              color={isCameraOn ? colors.background : colors.textMuted}
            />
          </TouchableOpacity>
        )}

        {/* Screen Share (initial meeting speakers / admin only — not for upgraded attendees) */}
        {isMeeting && initialRole === "speaker" && !livekitUnavailable && !connectionFailed && (
          <TouchableOpacity
            style={[styles.controlBtn, isScreenSharing && styles.controlBtnScreenShare]}
            onPress={toggleScreenShare}
          >
            <Ionicons
              name={isScreenSharing ? "stop-circle-outline" : "share-outline"}
              size={22}
              color={isScreenSharing ? "#FFF" : colors.textMuted}
            />
          </TouchableOpacity>
        )}

        {/* Chat */}
        <TouchableOpacity
          style={[styles.controlBtn, showChat && styles.controlBtnActive]}
          onPress={toggleChat}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={22}
            color={showChat ? colors.background : colors.textMuted}
          />
          {unreadCount > 0 && !showChat && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Participants */}
        <TouchableOpacity
          style={[styles.controlBtn, isAdminInMeeting && pendingSpeakRequests.length > 0 && styles.controlBtnAlert]}
          onPress={() => setShowParticipants(true)}
        >
          <Ionicons name="people-outline" size={22} color={colors.textMuted} />
          {isAdminInMeeting && pendingSpeakRequests.length > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{pendingSpeakRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Participants + Speak Requests Modal ── */}
      <Modal
        visible={showParticipants}
        transparent
        animationType="slide"
        onRequestClose={() => setShowParticipants(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Participants ({participantCount})</Text>
              <TouchableOpacity onPress={() => setShowParticipants(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.participantList} showsVerticalScrollIndicator={false}>
              {/* Speak requests section (admin only) */}
              {isAdminInMeeting && pendingSpeakRequests.length > 0 && (
                <View style={styles.speakReqSection}>
                  <Text style={styles.speakReqSectionTitle}>Speak Requests ({pendingSpeakRequests.length})</Text>
                  {pendingSpeakRequests.map((req) => (
                    <View key={req.pubkey} style={styles.speakReqRow}>
                      <View style={[styles.participantAvatar, { backgroundColor: getAvatarColor(req.pubkey) + "40" }]}>
                        <Text style={[styles.participantAvatarText, { color: getAvatarColor(req.pubkey) }]}>
                          {getInitial(req.name)}
                        </Text>
                      </View>
                      <View style={styles.participantInfo}>
                        <Text style={styles.participantName}>{req.name}</Text>
                        <Text style={styles.participantRole}>Wants to speak</Text>
                      </View>
                      <TouchableOpacity style={styles.approveBtn} onPress={() => handleApproveSpeak(req)}>
                        <Text style={styles.approveBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.denyBtn} onPress={() => handleDenySpeak(req)}>
                        <Ionicons name="close" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Local participant */}
              <View style={styles.participantRow}>
                <View style={[styles.participantAvatar, { backgroundColor: getAvatarColor(localIdentity) + "40" }]}>
                  <Text style={[styles.participantAvatarText, { color: getAvatarColor(localIdentity) }]}>
                    {getInitial(localDisplayName)}
                  </Text>
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>{localDisplayName}</Text>
                  <Text style={styles.participantRole}>You · {role}</Text>
                </View>
                {isMeeting && hostPubkey && localIdentity === hostPubkey && (
                  <Ionicons name="star" size={14} color="#FFA502" style={{ marginLeft: 4 }} />
                )}
                {isMicOn && <Ionicons name="mic" size={16} color={colors.primary} />}
                {isCameraOn && <Ionicons name="videocam" size={16} color={colors.primary} style={{ marginLeft: 4 }} />}
                {isScreenSharing && <Ionicons name="desktop-outline" size={16} color={colors.primary} style={{ marginLeft: 4 }} />}
                {activeSpeakers.has(localIdentity) && (
                  <View style={styles.speakingDot} />
                )}
              </View>

              {/* Remote participants */}
              {remoteIdentities.map((identity) => {
                const name = participantNames[identity] || shortenAddress(identity);
                const color = getAvatarColor(identity);
                const isSpeaking = activeSpeakers.has(identity);
                const hasVideo = remoteVideoTracks.some((t) => t.identity === identity);
                const isSharingScreen = remoteScreenShare?.identity === identity;
                const remoteP = roomRef.current?.remoteParticipants?.get(identity);
                const canPublish = remoteP?.permissions?.canPublish === true;
                return (
                  <View key={identity} style={styles.participantRow}>
                    <View style={[styles.participantAvatar, { backgroundColor: color + "40" }]}>
                      <Text style={[styles.participantAvatarText, { color }]}>{getInitial(name)}</Text>
                    </View>
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantName}>{name}</Text>
                      <Text style={styles.participantRole}>
                        {isMeeting ? (canPublish ? "Speaker" : "Listener") : "Member"}
                      </Text>
                    </View>
                    {isMeeting && hostPubkey && identity === hostPubkey && (
                      <Ionicons name="star" size={14} color="#FFA502" style={{ marginLeft: 4 }} />
                    )}
                    {hasVideo && <Ionicons name="videocam" size={16} color={colors.primary} style={{ marginLeft: 4 }} />}
                    {isSharingScreen && <Ionicons name="desktop-outline" size={16} color={colors.primary} style={{ marginLeft: 4 }} />}
                    {isSpeaking && <View style={styles.speakingDot} />}
                    {isAdminInMeeting && canPublish && (
                      <TouchableOpacity style={styles.revokeBtn} onPress={() => handleRevokeSpeak(identity)}>
                        <Text style={styles.revokeBtnText}>Revoke</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}

              {remoteIdentities.length === 0 && (
                <Text style={styles.noParticipants}>No other participants yet</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  connectingText: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted },
  connectingLeaveBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  connectingLeaveBtnText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },

  // Name modal
  nameModalWrapper: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg, backgroundColor: colors.background },
  nameModalCard: { width: "100%", backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.xl, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  nameModalTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.text, marginBottom: 6, textAlign: "center" },
  nameModalSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 18, marginBottom: spacing.lg },
  nameModalInput: { width: "100%", backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontFamily: fonts.body, fontSize: 16, color: colors.text, marginBottom: spacing.md, textAlign: "center" },
  nameModalBtn: { width: "100%", paddingVertical: 14, backgroundColor: colors.primary, borderRadius: borderRadius.md, alignItems: "center" },
  nameModalBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.background },
  nameModalCancel: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },

  // Header
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.xs, marginRight: spacing.sm },
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,255,163,0.1)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#00FFA3" },
  liveText: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: "#00FFA3", letterSpacing: 0.8 },
  meetingBadge: { backgroundColor: `${colors.primary}20`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  meetingBadgeText: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.primary, letterSpacing: 0.8 },
  headerTitle: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
  participantChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: `${colors.primary}15`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  participantChipText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primary },
  reqBadge: { position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: "#FF4757", alignItems: "center", justifyContent: "center" },
  reqBadgeText: { fontFamily: fonts.bodySemiBold, fontSize: 8, color: "#FFF" },
  leaveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: "#FF4757" },
  endMeetingBtn: { backgroundColor: "#C0392B", marginRight: 6 },
  leaveBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: "#FFFFFF" },

  // Banners
  unavailableBanner: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs, backgroundColor: "rgba(255,165,2,0.1)", borderBottomWidth: 1, borderBottomColor: "rgba(255,165,2,0.2)", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  errorBanner: { backgroundColor: "rgba(255,71,87,0.1)", borderBottomColor: "rgba(255,71,87,0.2)" },
  unavailableText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: "#FFA502", lineHeight: 16 },

  // Attendance strip
  attendanceStrip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: spacing.md, paddingVertical: 10, backgroundColor: `${colors.primary}12`, borderBottomWidth: 1, borderBottomColor: `${colors.primary}25` },
  attendanceStripText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primary },
  attendanceStripDone: { backgroundColor: "rgba(46,213,115,0.1)", borderBottomColor: "rgba(46,213,115,0.2)" },
  hostLeftBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: spacing.md, paddingVertical: 10, backgroundColor: "rgba(255,165,2,0.1)", borderBottomWidth: 1, borderBottomColor: "rgba(255,165,2,0.2)" },
  hostLeftText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 12, color: "#FFA502" },

  // Main
  main: { flex: 1 },

  // Stage with avatars (audio-only view)
  stage: { alignItems: "center", paddingTop: 36, paddingBottom: 20, paddingHorizontal: spacing.lg },
  stageLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textMuted, marginBottom: 24, textAlign: "center" },
  avatarsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginBottom: 16 },
  avatarWrapper: { alignItems: "center", gap: 4 },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  avatarSpeaking: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarInitial: { fontFamily: fonts.bodySemiBold, fontSize: 22 },
  avatarLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, maxWidth: 60, textAlign: "center" },
  avatarOverflow: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  avatarOverflowText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textMuted },
  participantCountText: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },

  // Video grid
  videoGrid: { flex: 1, flexDirection: "row", flexWrap: "wrap", padding: 4, gap: 4 },
  videoTile: { borderRadius: borderRadius.md, overflow: "hidden", backgroundColor: "#111" },
  videoTileFull: { width: "100%", height: "100%", flex: 1, minHeight: 200 },
videoTileMini: { width: 100, height: 130, marginRight: 6, borderRadius: borderRadius.md, overflow: "hidden", backgroundColor: "#111" },
  videoTileOverflow: { alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  videoTrackFill: { width: "100%", height: "100%" },
  videoNameOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 4, paddingHorizontal: 8, backgroundColor: "rgba(0,0,0,0.55)" },
  videoNameText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: "#FFF" },
  videoOverflowText: { fontFamily: fonts.bodySemiBold, fontSize: 18, color: colors.textMuted },
  videoOverflowSub: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, marginTop: 2 },
  cameraFlipBtn: { position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  miniVideoRow: { height: 140, paddingHorizontal: 6, paddingVertical: 4 },

  // Screen share
  screenShareContainer: { flex: 1 },
  screenShareBanner: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.md, paddingVertical: 8, backgroundColor: `${colors.primary}15` },
  screenShareBannerText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primary },
  screenShareVideo: { flex: 1, backgroundColor: "#000" },
  screenShareVideoWrap: { flex: 1, position: "relative" as const },
  stopShareOverlay: { position: "absolute" as const, bottom: 16, alignSelf: "center" as const, flexDirection: "row" as const, alignItems: "center" as const, gap: 6, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "rgba(255,71,87,0.9)", borderRadius: borderRadius.md },
  screenSharePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#111", gap: 12 },
  screenSharePlaceholderText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  stopShareBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#FF4757", borderRadius: borderRadius.md },
  stopShareBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: "#FFF" },

  // Chat
  chatContainer: { flex: 1, borderTopWidth: 1, borderTopColor: colors.border },
  chatList: { padding: spacing.sm, paddingBottom: spacing.xs, gap: spacing.xs },
  chatEmpty: { textAlign: "center", fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, paddingTop: spacing.xl },
  msgRow: { alignItems: "flex-start", marginBottom: 4 },
  msgRowSelf: { alignItems: "flex-end" },
  msgBubble: { maxWidth: "75%", backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  msgBubbleSelf: { backgroundColor: `${colors.primary}25`, borderColor: `${colors.primary}40` },
  msgSender: { fontFamily: fonts.bodySemiBold, fontSize: 10, color: colors.primary, marginBottom: 2 },
  msgText: { fontFamily: fonts.body, fontSize: 13, color: colors.text, lineHeight: 18 },
  msgTextSelf: { color: colors.text },
  inputRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  chatInput: { flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontFamily: fonts.body, fontSize: 14, color: colors.text, maxHeight: 80 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.4 },

  // Controls
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  controlBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  controlBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  controlBtnPending: { borderColor: colors.primary },
  controlBtnAlert: { borderColor: "#FF4757" },
  controlBtnScreenShare: { backgroundColor: "#FF4757", borderColor: "#FF4757" },
  unreadBadge: { position: "absolute", top: 0, right: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: "#FF4757", alignItems: "center", justifyContent: "center" },
  unreadBadgeText: { fontFamily: fonts.bodySemiBold, fontSize: 9, color: "#FFFFFF" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.border, borderBottomWidth: 0, paddingHorizontal: spacing.md, paddingBottom: 40, height: "65%" },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginTop: spacing.sm, marginBottom: spacing.md },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  modalTitle: { fontFamily: fonts.heading, fontSize: 17, color: colors.text },
  modalCloseBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: colors.background },
  participantList: { flex: 1, flexGrow: 1 },
  participantRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  participantAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", marginRight: spacing.sm },
  participantAvatarText: { fontFamily: fonts.bodySemiBold, fontSize: 14 },
  participantInfo: { flex: 1 },
  participantName: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  participantRole: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 1 },
  speakingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  noParticipants: { textAlign: "center", fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, paddingVertical: spacing.xl },

  // Speak requests section (admin)
  speakReqSection: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm, marginBottom: spacing.sm },
  speakReqSectionTitle: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primary, marginBottom: spacing.sm },
  speakReqRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: spacing.xs },
  approveBtn: { paddingHorizontal: 12, paddingVertical: 5, backgroundColor: colors.primary, borderRadius: 12 },
  approveBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: colors.background },
  denyBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  revokeBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.sm, backgroundColor: "rgba(255,71,87,0.15)", marginLeft: 8 },
  revokeBtnText: { fontFamily: fonts.body, fontSize: 11, color: "#FF4757", fontWeight: "600" as const },
});
