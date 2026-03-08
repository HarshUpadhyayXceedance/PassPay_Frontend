import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useTickets } from "../../hooks/useTickets";
import { useRooms } from "../../hooks/useRooms";
import { formatDate, formatSOL } from "../../utils/formatters";
import { showInfo, showError, showSuccess } from "../../utils/alerts";
import { confirm } from "../../components/ui/ConfirmDialogProvider";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = 240;

const GRADIENTS: [string, string][] = [
  ["#6C5CE7", "#00CEC9"],
  ["#E17055", "#FDCB6E"],
  ["#0984E3", "#6C5CE7"],
  ["#00B894", "#00CEC9"],
  ["#E84393", "#FD79A8"],
];

function shortenAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function TicketDetailsScreen() {
  const router = useRouter();
  const { ticketKey } = useLocalSearchParams<{ ticketKey: string }>();
  const { tickets } = useTickets();
  const { joinMeeting, confirmAttendance } = useRooms();
  const [isJoiningMeeting, setIsJoiningMeeting] = useState(false);
  const [isConfirmingAttendance, setIsConfirmingAttendance] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const ticket = tickets.find((t) => t.publicKey === ticketKey);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!ticket) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ticket Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Ticket not found</Text>
        </View>
      </View>
    );
  }

  const gradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
  const eventDate = new Date(ticket.eventDate);
  const isPastEvent = eventDate < new Date();
  const isOnline = ticket.eventVenue.toLowerCase() === "online";

  const handleShowQR = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/(user)/ticket-qr", params: { ticketKey: ticket.publicKey } });
  };

  const handleTransfer = () => {
    router.push({ pathname: "/(user)/transfer-ticket", params: { ticketKey: ticket.publicKey } });
  };

  const handleRefund = () => {
    confirm({
      title: "Request Refund",
      message: "Are you sure you want to request a refund for this ticket?",
      type: "danger",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        {
          text: "Request Refund",
          style: "destructive",
          onPress: () => {
            router.push({ pathname: "/(user)/refund", params: { ticketKey: ticket.publicKey } });
          },
        },
      ],
    });
  };

  const handleViewOnExplorer = () => {
    const url = `https://explorer.solana.com/address/${ticket.mint}?cluster=devnet`;
    Linking.openURL(url);
  };

  const handleJoinMeeting = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsJoiningMeeting(true);
    try {
      const result = await joinMeeting(ticket.eventKey);
      if (result.token && result.livekitUrl) {
        router.push({
          pathname: "/(user)/room",
          params: {
            roomId: `meeting-${ticket.eventKey}`,
            title: ticket.eventName,
            token: result.token,
            livekitUrl: result.livekitUrl,
            role: result.role,
            eventPda: ticket.eventKey,
            ticketMint: ticket.mint,
            hostPubkey: result.room?.creator ?? "",
            isAlreadyCheckedIn: String(ticket.isCheckedIn),
            eventDate: String(ticket.eventDate instanceof Date
              ? ticket.eventDate.getTime()
              : new Date(ticket.eventDate).getTime()),
            joinTimestamp: String(Date.now()),
          },
        });
      }
    } catch (err: any) {
      showError("Cannot Join", err.message ?? "Could not join the meeting.");
    } finally {
      setIsJoiningMeeting(false);
    }
  }, [ticket, joinMeeting, router]);

  const handleConfirmAttendanceFromTicket = useCallback(async () => {
    if (!ticket) return;
    setIsConfirmingAttendance(true);
    try {
      await confirmAttendance(ticket.eventKey, ticket.mint);
      showSuccess("Attendance Confirmed", "Your attendance has been recorded on-chain!");
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (msg.includes("AlreadyCheckedIn")) {
        showInfo("Already Confirmed", "Your attendance was already recorded.");
      } else if (msg.includes("EventNotStarted")) {
        showError("Cannot Confirm Attendance", "The event has not started yet. Please try again when the event begins.");
      } else {
        showError("Confirmation Failed", "Could not confirm attendance. Please try again later.");
      }
    } finally {
      setIsConfirmingAttendance(false);
    }
  }, [ticket, confirmAttendance]);

  const handleAddToCalendar = () => {
    const startDate = eventDate.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const endDate = new Date(eventDate.getTime() + 2 * 60 * 60 * 1000)
      .toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const title = encodeURIComponent(ticket.eventName);
    const location = encodeURIComponent(ticket.eventVenue);
    const details = encodeURIComponent(`Seat #${ticket.seatNumber} - NFT Ticket on Solana`);
    const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&location=${location}&details=${details}`;
    Linking.openURL(calUrl);
  };

  const handleCopyMint = async () => {
    await Clipboard.setStringAsync(ticket.mint);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showInfo("Copied", "Mint address copied to clipboard");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ticket Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Animated.ScrollView
        style={[styles.scrollView, { opacity: fadeAnim }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.heroSection,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {ticket.eventIsCancelled ? (
              <View style={[styles.statusBadge, styles.cancelledBadge]}>
                <Text style={styles.statusBadgeText}>CANCELLED</Text>
              </View>
            ) : ticket.isCheckedIn ? (
              <View style={[styles.statusBadge, styles.usedBadge]}>
                <Text style={styles.statusBadgeText}>✓ USED</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, styles.validBadge]}>
                <Text style={styles.statusBadgeText}>✓ VALID</Text>
              </View>
            )}

            {!isOnline && ticket.seatTierName && (
              <View style={[styles.statusBadge, styles.tierBadge]}>
                <Text style={styles.statusBadgeText}>{ticket.seatTierName.toUpperCase()}</Text>
              </View>
            )}

            <View style={styles.seatContainer}>
              <Text style={styles.seatLabel}>SEAT</Text>
              <Text style={styles.seatNumber}>#{ticket.seatNumber}</Text>
            </View>

            <View style={styles.passBadge}>
              <Text style={styles.passBadgeText}>NFT PASS</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Event Information</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Event Name</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {ticket.eventName}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date & Time</Text>
            <Text style={styles.infoValue}>{formatDate(ticket.eventDate)}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Venue</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {ticket.eventVenue}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text
              style={[
                styles.infoValue,
                ticket.eventIsCancelled
                  ? styles.cancelledEvent
                  : ticket.eventIsMeetingEnded
                  ? styles.pastEvent
                  : isPastEvent
                  ? styles.pastEvent
                  : styles.upcomingEvent,
              ]}
            >
              {ticket.eventIsCancelled
                ? "Event Cancelled"
                : ticket.eventIsMeetingEnded
                ? "Meeting Ended"
                : isPastEvent
                ? "Past Event"
                : "Upcoming"}
            </Text>
          </View>

          {ticket.refundStatus !== "none" && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Refund Status</Text>
              <Text
                style={[
                  styles.infoValue,
                  ticket.refundStatus === "pending" && { color: "#FFA502" },
                  ticket.refundStatus === "approved" && { color: "#2ED573" },
                  ticket.refundStatus === "rejected" && { color: "#FF4757" },
                ]}
              >
                {ticket.refundStatus === "pending"
                  ? "Refund Pending (awaiting admin)"
                  : ticket.refundStatus === "approved"
                  ? "Refund Approved"
                  : "Refund Rejected"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Purchase Information</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Owner</Text>
            <Text style={[styles.infoValue, styles.addressValue]}>
              {shortenAddress(ticket.owner)}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>NFT Details</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Mint Address</Text>
            <TouchableOpacity
              style={styles.addressRow}
              onPress={handleCopyMint}
              activeOpacity={0.7}
            >
              <Text style={[styles.infoValue, styles.addressValue]}>
                {shortenAddress(ticket.mint, 8)}
              </Text>
              <Ionicons name="copy-outline" size={16} color={colors.textMuted} style={styles.copyIcon} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.solscanButton}
            onPress={handleViewOnExplorer}
            activeOpacity={0.8}
          >
            <Text style={styles.solscanButtonText}>
              View on Solana Explorer →
            </Text>
          </TouchableOpacity>
        </View>

        {ticket.eventIsCancelled && (
          <View style={styles.cancelledAlertBanner}>
            <Text style={styles.cancelledAlertTitle}>Event Cancelled</Text>
            <Text style={styles.cancelledAlertText}>
              This event has been cancelled by the organizer.
              {!ticket.isCheckedIn && ticket.refundStatus === "none"
                ? " You are eligible for a full refund."
                : ""}
            </Text>
          </View>
        )}

        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Actions</Text>

          {ticket.eventIsCancelled && !ticket.isCheckedIn && ticket.refundStatus === "none" && (
            <TouchableOpacity
              style={styles.primaryRefundButton}
              onPress={handleRefund}
              activeOpacity={0.8}
            >
              <Ionicons name="cash-outline" size={24} color="#FFFFFF" style={styles.primaryActionIcon} />
              <View style={styles.actionButtonContent}>
                <Text style={styles.primaryActionTitle}>Claim Refund</Text>
                <Text style={styles.primaryActionSubtitle}>
                  Get your SOL back instantly
                </Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </TouchableOpacity>
          )}

          {isOnline && !ticket.eventIsCancelled && !ticket.eventIsMeetingEnded && (
            <TouchableOpacity
              style={[styles.joinMeetingButton, isJoiningMeeting && { opacity: 0.6 }]}
              onPress={handleJoinMeeting}
              activeOpacity={0.8}
              disabled={isJoiningMeeting}
            >
              {isJoiningMeeting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="mic-outline" size={24} color="#FFFFFF" style={styles.primaryActionIcon} />
                  <View style={styles.actionButtonContent}>
                    <Text style={[styles.primaryActionTitle, { color: "#FFFFFF" }]}>Join Meeting</Text>
                    <Text style={[styles.primaryActionSubtitle, { color: "rgba(255,255,255,0.75)" }]}>
                      Enter the live audio room
                    </Text>
                  </View>
                  <Text style={[styles.actionArrow, { color: "#FFFFFF" }]}>→</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isOnline && !ticket.isCheckedIn && !ticket.eventIsCancelled && (
            <TouchableOpacity
              style={[styles.secondaryActionButton, isConfirmingAttendance && { opacity: 0.6 }]}
              onPress={handleConfirmAttendanceFromTicket}
              activeOpacity={0.8}
              disabled={isConfirmingAttendance}
            >
              {isConfirmingAttendance ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={26} color={colors.success} style={{ marginRight: 12 }} />
                  <View style={styles.actionButtonContent}>
                    <Text style={styles.secondaryActionTitle}>Confirm Attendance</Text>
                    <Text style={styles.secondaryActionSubtitle}>
                      Record on-chain
                    </Text>
                  </View>
                  <Text style={styles.actionArrow}>→</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {!isOnline && !ticket.eventIsCancelled && (
            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={handleShowQR}
              activeOpacity={0.8}
            >
              <Ionicons name="qr-code-outline" size={24} color={colors.background} style={styles.primaryActionIcon} />
              <View style={styles.actionButtonContent}>
                <Text style={styles.primaryActionTitle}>Show QR Code</Text>
                <Text style={styles.primaryActionSubtitle}>
                  Present this at check-in
                </Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </TouchableOpacity>
          )}

          {!isPastEvent && !ticket.eventIsCancelled && (
            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={handleAddToCalendar}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={24} color={colors.text} style={styles.secondaryActionIcon} />
              <View style={styles.actionButtonContent}>
                <Text style={styles.secondaryActionTitle}>
                  Add to Calendar
                </Text>
                <Text style={styles.secondaryActionSubtitle}>
                  Save event date to your calendar
                </Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </TouchableOpacity>
          )}

          {!isPastEvent && !ticket.isCheckedIn && !ticket.eventIsCancelled && (
            <>
              <TouchableOpacity
                style={styles.secondaryActionButton}
                onPress={handleTransfer}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-redo-outline" size={24} color={colors.text} style={styles.secondaryActionIcon} />
                <View style={styles.actionButtonContent}>
                  <Text style={styles.secondaryActionTitle}>
                    Transfer Ticket
                  </Text>
                  <Text style={styles.secondaryActionSubtitle}>
                    Send to another wallet
                  </Text>
                </View>
                <Text style={styles.actionArrow}>→</Text>
              </TouchableOpacity>

              {ticket.refundStatus !== "rejected" && ticket.refundStatus !== "pending" && (
                <TouchableOpacity
                  style={styles.dangerActionButton}
                  onPress={handleRefund}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh-outline" size={24} color="#FF4757" style={styles.dangerActionIcon} />
                  <View style={styles.actionButtonContent}>
                    <Text style={styles.dangerActionTitle}>
                      Request Refund
                    </Text>
                    <Text style={styles.dangerActionSubtitle}>
                      Cancel and get refund
                    </Text>
                  </View>
                  <Text style={styles.actionArrow}>→</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 20,
    color: colors.text,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  heroSection: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    marginBottom: 20,
  },
  heroGradient: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  validBadge: {
    backgroundColor: "rgba(0,206,201,0.9)",
  },
  usedBadge: {
    backgroundColor: "rgba(143,149,178,0.9)",
  },
  cancelledBadge: {
    backgroundColor: "rgba(255,71,87,0.9)",
  },
  tierBadge: {
    backgroundColor: "rgba(108,92,231,0.8)",
    marginTop: 8,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.background,
    letterSpacing: 1,
    fontFamily: fonts.bodyBold,
  },
  seatContainer: {
    alignItems: "center",
  },
  seatLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 2,
    marginBottom: 8,
    fontFamily: fonts.bodySemiBold,
  },
  seatNumber: {
    fontSize: 72,
    fontWeight: "800",
    color: colors.text,
    fontFamily: fonts.heading,
  },
  passBadge: {
    alignSelf: "center",
    backgroundColor: "rgba(10,14,26,0.70)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  passBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 1.5,
    fontFamily: fonts.bodyBold,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
    fontFamily: fonts.headingSemiBold,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: fonts.bodySemiBold,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
    fontFamily: fonts.bodyMedium,
  },
  priceValue: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 18,
    fontFamily: fonts.heading,
  },
  addressValue: {
    fontFamily: "monospace",
    fontSize: 14,
  },
  upcomingEvent: {
    color: colors.secondary,
  },
  pastEvent: {
    color: "#FF6B6B",
    fontWeight: "700",
  },
  cancelledEvent: {
    color: "#FF4757",
    fontWeight: "700",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  copyIcon: {
    marginLeft: 8,
  },
  solscanButton: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    marginTop: 4,
  },
  solscanButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    fontFamily: fonts.bodySemiBold,
  },

  cancelledAlertBanner: {
    backgroundColor: "rgba(255,71,87,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,71,87,0.3)",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  cancelledAlertTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF4757",
    marginBottom: 4,
    fontFamily: fonts.headingSemiBold,
  },
  cancelledAlertText: {
    fontSize: 14,
    color: "rgba(255,71,87,0.8)",
    lineHeight: 20,
    fontFamily: fonts.body,
  },
  primaryRefundButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF4757",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  actionsSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
    fontFamily: fonts.headingSemiBold,
  },
  joinMeetingButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00b09b",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  primaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  primaryActionIcon: {
    marginRight: 12,
  },
  actionButtonContent: {
    flex: 1,
  },
  primaryActionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.background,
    marginBottom: 2,
    fontFamily: fonts.headingSemiBold,
  },
  primaryActionSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(10,14,26,0.7)",
    fontFamily: fonts.body,
  },
  actionArrow: {
    fontSize: 20,
    color: colors.background,
    marginLeft: 8,
  },
  secondaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  secondaryActionIcon: {
    marginRight: 12,
  },
  secondaryActionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
    fontFamily: fonts.headingSemiBold,
  },
  secondaryActionSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
    fontFamily: fonts.body,
  },
  dangerActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,71,87,0.1)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,71,87,0.3)",
    padding: 16,
    marginBottom: 12,
  },
  dangerActionIcon: {
    marginRight: 12,
  },
  dangerActionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF4757",
    marginBottom: 2,
    fontFamily: fonts.headingSemiBold,
  },
  dangerActionSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,71,87,0.7)",
    fontFamily: fonts.body,
  },
});
