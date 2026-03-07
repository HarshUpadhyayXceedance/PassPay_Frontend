import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRooms } from "../../hooks/useRooms";
import { CommunityRoom } from "../../types/room";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing, borderRadius } from "../../theme/spacing";
import { showError } from "../../utils/alerts";

const SKR_COLOR = "#9945FF"; // Solana purple for Seeker brand

function shortenAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function CommunityRoomsScreen() {
  const router = useRouter();
  const { rooms, isLoading, fetchRooms, createRoom, joinRoom } = useRooms();

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSeekerGated, setIsSeekerGated] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [pendingJoinRoom, setPendingJoinRoom] = useState<CommunityRoom | null>(null);
  const [joinDisplayName, setJoinDisplayName] = useState("");

  // Shown when the user fails the SKR verification gate
  const [showSeekerGatedModal, setShowSeekerGatedModal] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRooms().catch(() => {});
    setRefreshing(false);
  }, [fetchRooms]);

  const handleCreateRoom = useCallback(async () => {
    const title = newTitle.trim();
    if (!title) {
      showError("Title Required", "Please enter a room name.");
      return;
    }
    if (title.length > 100) {
      showError("Too Long", "Room name must be under 100 characters.");
      return;
    }
    setCreating(true);
    try {
      const result = await createRoom({ title, isSeekerGated });
      setShowCreate(false);
      setNewTitle("");
      const name = displayName.trim();
      setDisplayName("");
      setIsSeekerGated(false);
      if (result.token && result.livekitUrl) {
        router.push({
          pathname: "/(user)/room",
          params: {
            roomId: result.room.id,
            title: result.room.title,
            token: result.token,
            livekitUrl: result.livekitUrl,
            role: result.role,
            displayName: name,
          },
        });
      }
    } catch (err: any) {
      showError("Create Failed", err.message ?? "Could not create room.");
    } finally {
      setCreating(false);
    }
  }, [newTitle, displayName, isSeekerGated, createRoom, router]);

  const handleJoinRoom = useCallback((room: CommunityRoom) => {
    setPendingJoinRoom(room);
    setJoinDisplayName("");
  }, []);

  const handleJoinConfirm = useCallback(async () => {
    if (!pendingJoinRoom) return;
    const room = pendingJoinRoom;
    const name = joinDisplayName.trim();
    setPendingJoinRoom(null);
    setJoiningId(room.id);
    try {
      const result = await joinRoom(room.id);
      if (result.token && result.livekitUrl) {
        router.push({
          pathname: "/(user)/room",
          params: {
            roomId: room.id,
            title: room.title,
            token: result.token,
            livekitUrl: result.livekitUrl,
            role: result.role,
            displayName: name,
          },
        });
      } else {
        showError("No Token", "Could not get meeting access. Try again.");
      }
    } catch (err: any) {
      // SEEKER_REQUIRED is returned as a 403 with error code in the message
      if (err.message?.includes("SEEKER_REQUIRED") || err.message?.includes("Seeker")) {
        setShowSeekerGatedModal(true);
      } else {
        showError("Join Failed", err.message ?? "Could not join room.");
      }
    } finally {
      setJoiningId(null);
    }
  }, [pendingJoinRoom, joinDisplayName, joinRoom, router]);

  const renderRoom = useCallback(
    ({ item }: { item: CommunityRoom }) => {
      const count = item.participantCount ?? 0;
      const isJoining = joiningId === item.id;
      const isGated = item.isSeekerGated === true;
      return (
        <TouchableOpacity
          style={[styles.roomCard, isGated && styles.roomCardGated]}
          onPress={() => handleJoinRoom(item)}
          activeOpacity={0.75}
          disabled={isJoining}
        >
          <View style={styles.roomCardLeft}>
            <View style={styles.liveRow}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
              {isGated && (
                <View style={styles.skrBadge}>
                  <Ionicons name="shield-checkmark" size={10} color={SKR_COLOR} />
                  <Text style={styles.skrBadgeText}>SKR</Text>
                </View>
              )}
            </View>
            <Text style={styles.roomTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.roomMeta}>
              by {shortenAddress(item.creator)} · {timeAgo(item.createdAt)}
            </Text>
          </View>
          <View style={styles.roomCardRight}>
            <View style={styles.participantBadge}>
              <Ionicons name="people" size={13} color={colors.primary} />
              <Text style={styles.participantCount}>{count}</Text>
            </View>
            {isJoining ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
            ) : (
              <TouchableOpacity
                style={[styles.joinButton, isGated && styles.joinButtonGated]}
                onPress={() => handleJoinRoom(item)}
                activeOpacity={0.8}
              >
                {isGated && <Ionicons name="shield-checkmark" size={11} color={colors.background} style={{ marginRight: 3 }} />}
                <Text style={styles.joinButtonText}>Join</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [joiningId, handleJoinRoom]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Community Rooms</Text>
          <Text style={styles.headerSub}>Open audio + text spaces for Solana users</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={22} color={colors.background} />
        </TouchableOpacity>
      </View>

      {isLoading && rooms.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Finding rooms...</Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={renderRoom}
          contentContainerStyle={[
            styles.listContent,
            rooms.length === 0 && styles.listEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="mic-outline" size={56} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
              <Text style={styles.emptyTitle}>No rooms yet</Text>
              <Text style={styles.emptySub}>
                Be the first to start a conversation
              </Text>
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                onPress={() => setShowCreate(true)}
              >
                <Text style={styles.emptyCreateText}>Create a Room</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Join — display name modal */}
      <Modal
        visible={!!pendingJoinRoom}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingJoinRoom(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            {pendingJoinRoom?.isSeekerGated && (
              <View style={styles.gatedNotice}>
                <Ionicons name="shield-checkmark" size={14} color={SKR_COLOR} />
                <Text style={styles.gatedNoticeText}>Seeker Exclusive — SKR token required</Text>
              </View>
            )}
            <Text style={styles.modalTitle}>Join "{pendingJoinRoom?.title}"</Text>
            <Text style={styles.modalSub}>Enter a display name so others know who you are.</Text>
            <TextInput
              style={styles.modalInput}
              value={joinDisplayName}
              onChangeText={setJoinDisplayName}
              placeholder="Your display name (optional)"
              placeholderTextColor={colors.textMuted}
              maxLength={30}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleJoinConfirm}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPendingJoinRoom(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleJoinConfirm}>
                <Text style={styles.confirmBtnText}>Join Room</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create room modal */}
      <Modal
        visible={showCreate}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreate(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create a Room</Text>
            <Text style={styles.modalSub}>
              Open audio + text room — anyone with a Solana wallet can join
            </Text>
            <TextInput
              style={styles.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Room name (e.g. Solana Talk)"
              placeholderTextColor={colors.textMuted}
              maxLength={100}
              autoFocus
              returnKeyType="next"
            />
            <TextInput
              style={[styles.modalInput, { marginTop: -spacing.xs }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your display name (optional)"
              placeholderTextColor={colors.textMuted}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={handleCreateRoom}
            />
            {/* Seeker Exclusive toggle */}
            <View style={styles.seekerToggleRow}>
              <View style={styles.seekerToggleLeft}>
                <Ionicons name="shield-checkmark" size={18} color={isSeekerGated ? SKR_COLOR : colors.textMuted} />
                <View style={styles.seekerToggleLabels}>
                  <Text style={[styles.seekerToggleTitle, isSeekerGated && styles.seekerToggleTitleActive]}>
                    Seeker Exclusive
                  </Text>
                  <Text style={styles.seekerToggleSub}>
                    Only SKR token holders can join
                  </Text>
                </View>
              </View>
              <Switch
                value={isSeekerGated}
                onValueChange={setIsSeekerGated}
                trackColor={{ false: colors.border, true: `${SKR_COLOR}60` }}
                thumbColor={isSeekerGated ? SKR_COLOR : colors.textMuted}
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowCreate(false);
                  setNewTitle("");
                  setIsSeekerGated(false);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, creating && styles.confirmBtnDisabled]}
                onPress={handleCreateRoom}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Text style={styles.confirmBtnText}>Create & Join</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Seeker gated — access denied modal */}
      <Modal
        visible={showSeekerGatedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSeekerGatedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.seekerDeniedIcon}>
              <Ionicons name="shield-checkmark" size={36} color={SKR_COLOR} />
            </View>
            <Text style={styles.modalTitle}>Seeker Exclusive Room</Text>
            <Text style={styles.modalSub}>
              This room is reserved for Seeker (SKR) token holders. SKR is the native token of the
              Solana Mobile Seeker device ecosystem — rewarding early supporters of the web3 mobile
              revolution.
            </Text>
            <Text style={styles.seekerDeniedHint}>
              Your connected wallet does not hold any SKR tokens. Acquire SKR on a Solana DEX to
              unlock access to Seeker-exclusive rooms.
            </Text>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => setShowSeekerGatedModal(false)}
            >
              <Text style={styles.confirmBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.text,
  },
  headerSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  createBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  listEmpty: {
    flex: 1,
  },
  roomCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  roomCardGated: {
    borderColor: `${SKR_COLOR}40`,
    backgroundColor: `${SKR_COLOR}08`,
  },
  roomCardLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 4,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00FFA3",
  },
  liveText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: "#00FFA3",
    letterSpacing: 1,
  },
  skrBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: `${SKR_COLOR}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${SKR_COLOR}40`,
  },
  skrBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9,
    color: SKR_COLOR,
    letterSpacing: 0.5,
  },
  roomTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text,
    marginBottom: 4,
  },
  roomMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  roomCardRight: {
    alignItems: "center",
  },
  participantBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  participantCount: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.primary,
  },
  joinButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  joinButtonGated: {
    backgroundColor: SKR_COLOR,
  },
  joinButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  emptyCreateBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  emptyCreateText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.background,
  },
  // Seeker gated notice in join modal
  gatedNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${SKR_COLOR}15`,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: `${SKR_COLOR}30`,
  },
  gatedNoticeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: SKR_COLOR,
  },
  // Seeker toggle in create modal
  seekerToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  seekerToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  seekerToggleLabels: {
    flex: 1,
  },
  seekerToggleTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  seekerToggleTitleActive: {
    color: SKR_COLOR,
  },
  seekerToggleSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  // Seeker denied modal
  seekerDeniedIcon: {
    alignSelf: "center",
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: `${SKR_COLOR}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${SKR_COLOR}30`,
  },
  seekerDeniedHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
    marginBottom: spacing.lg,
    padding: spacing.sm,
    backgroundColor: `${colors.error}10`,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  // Modal shared
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.text,
    marginBottom: 6,
  },
  modalSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.background,
  },
});
