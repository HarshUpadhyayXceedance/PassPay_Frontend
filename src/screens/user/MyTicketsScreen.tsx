import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Animated,
  Share,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTickets } from "../../hooks/useTickets";
import { useRooms } from "../../hooks/useRooms";
import { TicketDisplay } from "../../types/ticket";
import { formatDate } from "../../utils/formatters";
import { showError } from "../../utils/alerts";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_HORIZONTAL_PADDING = 20;
const CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_PADDING * 2;
const IMAGE_HEIGHT = 180;

const GRADIENTS: [string, string][] = [
  ["#6C5CE7", "#00CEC9"],
  ["#E17055", "#FDCB6E"],
  ["#0984E3", "#6C5CE7"],
  ["#00B894", "#00CEC9"],
  ["#E84393", "#FD79A8"],
];

type TabKey = "upcoming" | "past";

function isEventToday(eventDate: Date): boolean {
  const now = new Date();
  const event = new Date(eventDate);
  return (
    event.getDate() === now.getDate() &&
    event.getMonth() === now.getMonth() &&
    event.getFullYear() === now.getFullYear()
  );
}

function hasEventStarted(eventDate: Date): boolean {
  return new Date() >= new Date(eventDate);
}

function getTimeUntilEvent(eventDate: Date): string {
  const now = new Date();
  const event = new Date(eventDate);
  const diff = event.getTime() - now.getTime();

  if (diff <= 0) return "Event Started";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m`;
}

export function MyTicketsScreen() {
  const router = useRouter();
  const { tickets, fetchMyTickets, isLoading } = useTickets();
  const { joinMeeting } = useRooms();
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming");
  const [joiningMeetingKey, setJoiningMeetingKey] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchMyTickets();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleTabSwitch = (tab: TabKey) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };

  const now = new Date();

  const upcomingTickets = tickets.filter(
    (t) => new Date(t.eventDate) >= now
  );
  const pastTickets = tickets.filter(
    (t) => new Date(t.eventDate) < now
  );

  const displayedTickets =
    activeTab === "upcoming" ? upcomingTickets : pastTickets;

  const getGradient = (index: number): [string, string] =>
    GRADIENTS[index % GRADIENTS.length];

  const handleJoinMeeting = useCallback(async (item: TicketDisplay) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setJoiningMeetingKey(item.publicKey);
    try {
      const result = await joinMeeting(item.eventKey);
      if (result.token && result.livekitUrl) {
        router.push({
          pathname: "/(user)/room",
          params: {
            roomId: `meeting-${item.eventKey}`,
            title: item.eventName,
            token: result.token,
            livekitUrl: result.livekitUrl,
            role: result.role,
            eventPda: item.eventKey,
            ticketMint: item.mint,
            isAlreadyCheckedIn: String(item.isCheckedIn),
            eventDate: String(item.eventDate instanceof Date
              ? item.eventDate.getTime()
              : new Date(item.eventDate).getTime()),
          },
        });
      }
    } catch (err: any) {
      showError("Cannot Join", err.message ?? "Could not join the meeting.");
    } finally {
      setJoiningMeetingKey(null);
    }
  }, [joinMeeting, router]);

  const renderPassCard = ({
    item,
    index,
  }: {
    item: TicketDisplay;
    index: number;
  }) => {
    const gradient = getGradient(index);
    const eventDate = new Date(item.eventDate);
    const isToday = isEventToday(eventDate);
    const started = hasEventStarted(eventDate);
    const timeUntil = getTimeUntilEvent(eventDate);
    const isPast = activeTab === "past";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          router.push({ pathname: "/(user)/ticket-details", params: { ticketKey: item.publicKey } });
        }}
        activeOpacity={0.9}
      >
        <View style={styles.imageContainer}>
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientImage}
          />

          <View style={styles.topBadgesRow}>
            {item.eventIsCancelled ? (
              <View style={[styles.statusBadge, styles.cancelledBadge]}>
                <Text style={styles.statusBadgeText}>CANCELLED</Text>
              </View>
            ) : item.isCheckedIn ? (
              <View style={[styles.statusBadge, styles.usedBadge]}>
                <Text style={styles.statusBadgeText}>USED</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, styles.validBadge]}>
                <Text style={styles.statusBadgeText}>VALID</Text>
              </View>
            )}

            {item.refundStatus === "pending" && (
              <View style={[styles.statusBadge, { backgroundColor: "#FFA502" }]}>
                <Text style={styles.statusBadgeText}>REFUND PENDING</Text>
              </View>
            )}
            {item.refundStatus === "approved" && (
              <View style={[styles.statusBadge, { backgroundColor: "#2ED573" }]}>
                <Text style={styles.statusBadgeText}>REFUNDED</Text>
              </View>
            )}
            {item.refundStatus === "rejected" && (
              <View style={[styles.statusBadge, { backgroundColor: "#FF4757" }]}>
                <Text style={styles.statusBadgeText}>REFUND REJECTED</Text>
              </View>
            )}

            {item.seatTierName && (
              <View style={[styles.statusBadge, styles.tierBadge]}>
                <Text style={styles.statusBadgeText}>{item.seatTierName.toUpperCase()}</Text>
              </View>
            )}

            {!item.eventIsCancelled && isToday && !started && !isPast && (
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>TODAY</Text>
              </View>
            )}

            {!item.eventIsCancelled && started && !isPast && (
              <View style={styles.startedBadge}>
                <Text style={styles.startedBadgeText}>LIVE NOW</Text>
              </View>
            )}
          </View>

          <View style={styles.proofPassBadge}>
            <Text style={styles.proofPassText}>
              Pass #{item.seatNumber}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.eventNameRow}>
            <Text style={styles.eventName} numberOfLines={2}>
              {item.eventName}
            </Text>
            {!isPast && !started && (
              <View style={styles.countdownBadge}>
                <Text style={styles.countdownText}>{timeUntil}</Text>
              </View>
            )}
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} style={styles.infoIcon} />
            <Text style={styles.infoText}>{formatDate(item.eventDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} style={styles.infoIcon} />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.eventVenue}
            </Text>
          </View>

          <View style={styles.actionRow}>
            {(() => {
              const isOnlineEvent = item.eventVenue.toLowerCase().startsWith("online");
              const isJoiningThis = joiningMeetingKey === item.publicKey;

              if (item.eventIsCancelled && !item.isCheckedIn && item.refundStatus === "none") {
                return (
                  <TouchableOpacity
                    style={styles.refundButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push({ pathname: "/(user)/refund", params: { ticketKey: item.publicKey } });
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.refundButtonText}>Get Refund</Text>
                  </TouchableOpacity>
                );
              }

              if (isOnlineEvent && !item.eventIsCancelled) {
                if (item.isCheckedIn || isPast) {
                  return (
                    <TouchableOpacity
                      style={styles.qrButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push({ pathname: "/(user)/ticket-details", params: { ticketKey: item.publicKey } });
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.qrButtonText}>View Details</Text>
                    </TouchableOpacity>
                  );
                }
                // Valid ticket: Join Event + View Details side by side
                return (
                  <View style={styles.dualButtonRow}>
                    <TouchableOpacity
                      style={[styles.halfButton, styles.joinMeetingButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleJoinMeeting(item);
                      }}
                      disabled={isJoiningThis}
                      activeOpacity={0.8}
                    >
                      {isJoiningThis ? (
                        <ActivityIndicator size="small" color={colors.background} />
                      ) : (
                        <Text style={styles.qrButtonText}>Join Event</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.halfButton, styles.detailsButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push({ pathname: "/(user)/ticket-details", params: { ticketKey: item.publicKey } });
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.qrButtonText, styles.detailsButtonText]}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                );
              }

              // Offline event → QR code
              return (
                <TouchableOpacity
                  style={styles.qrButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: "/(user)/ticket-qr", params: { ticketKey: item.publicKey } });
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.qrButtonText}>
                    {isPast ? "View QR" : "Show Ticket QR"}
                  </Text>
                </TouchableOpacity>
              );
            })()}

            <TouchableOpacity
              style={styles.shareButton}
              onPress={async (e) => {
                e.stopPropagation();
                try {
                  await Share.share({
                    message: `Check out my ticket for ${item.eventName}!\n\nDate: ${formatDate(item.eventDate)}\nVenue: ${item.eventVenue}\nSeat: #${item.seatNumber}\n\nVerified NFT ticket on Solana`,
                  });
                } catch {}
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.shareIcon}>↗</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Passes</Text>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => router.push("/(user)/transaction-history" as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.historyIcon}>🕘</Text>
        </TouchableOpacity>
      </View>

      {/* Tab toggle */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "upcoming" ? styles.tabActive : styles.tabInactive,
          ]}
          onPress={() => handleTabSwitch("upcoming")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "upcoming"
                ? styles.tabTextActive
                : styles.tabTextInactive,
            ]}
          >
            Upcoming ({upcomingTickets.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "past" ? styles.tabActive : styles.tabInactive,
          ]}
          onPress={() => handleTabSwitch("past")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "past"
                ? styles.tabTextActive
                : styles.tabTextInactive,
            ]}
          >
            Past Events
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pass list */}
      <Animated.FlatList
        style={{ opacity: fadeAnim }}
        data={displayedTickets}
        renderItem={renderPassCard}
        keyExtractor={(item) => item.publicKey}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchMyTickets}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {activeTab === "upcoming"
                  ? "No Upcoming Passes"
                  : "No Past Events"}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === "upcoming"
                  ? "Browse events and grab your first pass"
                  : "Your attended events will appear here"}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ---- Header ---- */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    fontFamily: fonts.heading,
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  historyIcon: {
    fontSize: 20,
  },

  /* ---- Tab toggle ---- */
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabInactive: {
    backgroundColor: "transparent",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: fonts.bodySemiBold,
  },
  tabTextActive: {
    color: colors.background,
  },
  tabTextInactive: {
    color: colors.textSecondary,
  },

  /* ---- List ---- */
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  /* ---- Pass card ---- */
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    width: "100%",
    height: IMAGE_HEIGHT,
    position: "relative",
  },
  gradientImage: {
    ...StyleSheet.absoluteFillObject,
  },
  topBadgesRow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  validBadge: {
    backgroundColor: colors.secondary,
  },
  usedBadge: {
    backgroundColor: colors.textMuted,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 0.5,
    fontFamily: fonts.bodyBold,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,193,7,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFD700",
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFD700",
    letterSpacing: 0.5,
    fontFamily: fonts.bodyBold,
  },
  startedBadge: {
    backgroundColor: "rgba(255,71,87,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  startedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FF4757",
    letterSpacing: 0.5,
    fontFamily: fonts.bodyBold,
  },
  cancelledBadge: {
    backgroundColor: "#FF4757",
  },
  tierBadge: {
    backgroundColor: "rgba(108,92,231,0.8)",
  },
  proofPassBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(10,14,26,0.80)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  proofPassText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
    fontFamily: fonts.bodySemiBold,
  },

  /* ---- Card content ---- */
  cardContent: {
    padding: 16,
  },
  eventNameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  eventName: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    fontFamily: fonts.headingSemiBold,
  },
  countdownBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    fontFamily: fonts.bodyBold,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: fonts.body,
  },

  /* ---- Action row ---- */
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  qrButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  joinMeetingButton: {
    backgroundColor: "#6C5CE7",
  },
  dualButtonRow: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    marginRight: 12,
  },
  halfButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  detailsButtonText: {
    color: colors.text,
  },
  qrButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.background,
    fontFamily: fonts.bodySemiBold,
  },
  shareButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  shareIcon: {
    fontSize: 20,
    color: colors.text,
  },
  refundButton: {
    flex: 1,
    backgroundColor: "#FF4757",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  refundButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
  },

  /* ---- Empty state ---- */
  emptyContainer: {
    alignItems: "center",
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    fontFamily: fonts.heading,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    fontFamily: fonts.body,
  },
});
