import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Linking,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useTickets } from "../../hooks/useTickets";
import { formatDate, formatSOL } from "../../utils/formatters";
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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const ticket = tickets.find((t) => t.publicKey === ticketKey);

  useEffect(() => {
    // Entrance animation
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
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
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

  const handleShowQR = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/(user)/ticket-qr", params: { ticketKey: ticket.publicKey } });
  };

  const handleTransfer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/(user)/transfer-ticket", params: { ticketKey: ticket.publicKey } });
  };

  const handleRefund = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Request Refund",
      "Are you sure you want to request a refund for this ticket?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Refund",
          style: "destructive",
          onPress: () => {
            router.push({ pathname: "/(user)/refund", params: { ticketKey: ticket.publicKey } });
          },
        },
      ]
    );
  };

  const handleViewOnSolscan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = `https://solscan.io/tx/${ticket.mint}?cluster=devnet`;
    Linking.openURL(url);
  };

  const handleAddToCalendar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    Alert.alert("Copied", "Mint address copied to clipboard");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
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
        {/* Hero Section with Gradient */}
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
            {/* Status Badge */}
            {ticket.isCheckedIn ? (
              <View style={[styles.statusBadge, styles.usedBadge]}>
                <Text style={styles.statusBadgeText}>✓ USED</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, styles.validBadge]}>
                <Text style={styles.statusBadgeText}>✓ VALID</Text>
              </View>
            )}

            {/* Seat Number - Large and Prominent */}
            <View style={styles.seatContainer}>
              <Text style={styles.seatLabel}>SEAT</Text>
              <Text style={styles.seatNumber}>#{ticket.seatNumber}</Text>
            </View>

            {/* Pass Badge */}
            <View style={styles.passBadge}>
              <Text style={styles.passBadgeText}>NFT PASS</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Event Information Card */}
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
                isPastEvent ? styles.pastEvent : styles.upcomingEvent,
              ]}
            >
              {isPastEvent ? "Event Ended" : "Upcoming"}
            </Text>
          </View>
        </View>

        {/* Purchase Information Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Purchase Information</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Owner</Text>
            <Text style={[styles.infoValue, styles.addressValue]}>
              {shortenAddress(ticket.owner)}
            </Text>
          </View>
        </View>

        {/* NFT Details Card */}
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
              <Text style={styles.copyIcon}>📋</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.solscanButton}
            onPress={handleViewOnSolscan}
            activeOpacity={0.8}
          >
            <Text style={styles.solscanButtonText}>
              View on Solscan →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={handleShowQR}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryActionIcon}>📱</Text>
            <View style={styles.actionButtonContent}>
              <Text style={styles.primaryActionTitle}>Show QR Code</Text>
              <Text style={styles.primaryActionSubtitle}>
                Present this at check-in
              </Text>
            </View>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>

          {!isPastEvent && (
            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={handleAddToCalendar}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryActionIcon}>📅</Text>
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

          {!isPastEvent && !ticket.isCheckedIn && (
            <>
              <TouchableOpacity
                style={styles.secondaryActionButton}
                onPress={handleTransfer}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryActionIcon}>↗️</Text>
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

              {!ticket.isCheckedIn && (
                <TouchableOpacity
                  style={styles.dangerActionButton}
                  onPress={handleRefund}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dangerActionIcon}>🔄</Text>
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

        {/* Bottom Spacer */}
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

  /* ---- Hero Section ---- */
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

  /* ---- Cards ---- */
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
    color: colors.textMuted,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  copyIcon: {
    fontSize: 16,
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

  /* ---- Actions Section ---- */
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
  primaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  primaryActionIcon: {
    fontSize: 24,
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
    fontSize: 24,
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
    fontSize: 24,
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
