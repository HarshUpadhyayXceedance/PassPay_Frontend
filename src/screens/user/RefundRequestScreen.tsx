import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTickets } from "../../hooks/useTickets";
import { useEvents } from "../../hooks/useEvents";
import { useMerchants } from "../../hooks/useMerchants";
import { apiRequestRefund, apiClaimCancellationRefund } from "../../services/api/eventApi";
import { formatSOL } from "../../utils/formatters";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";

export function RefundRequestScreen() {
  const router = useRouter();
  const { ticketKey } = useLocalSearchParams<{ ticketKey: string }>();
  const { tickets } = useTickets();
  const { getEvent } = useEvents();
  const { seatTiers, fetchSeatTiers } = useMerchants();
  const [processing, setProcessing] = useState(false);

  const ticket = useMemo(
    () => tickets.find((t) => t.publicKey === ticketKey),
    [tickets, ticketKey]
  );

  const event = useMemo(
    () => (ticket ? getEvent(ticket.eventKey) : undefined),
    [ticket, getEvent]
  );

  if (!ticket || !event) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Refund</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Ionicons
            name="ticket-outline"
            size={48}
            color={colors.textMuted}
          />
          <Text style={styles.errorText}>
            {!ticket ? "Ticket not found" : "Event not found"}
          </Text>
        </View>
      </View>
    );
  }

  // Use actual price paid (after loyalty discount) for refund display
  const refundAmount = ticket.pricePaid > 0
    ? ticket.pricePaid / 1_000_000_000
    : event.ticketPrice;

  const isCancelledEvent = ticket.eventIsCancelled;

  // Resolve the seat tier PDA for this ticket
  const resolveSeatTierPda = async (): Promise<string> => {
    // Fetch tiers for this event if not already loaded
    await fetchSeatTiers(ticket.eventKey);
    const eventTiers = seatTiers.filter((t) => t.eventKey === ticket.eventKey);
    const matchingTier = eventTiers.find((t) => t.tierLevel === ticket.seatTier);
    if (!matchingTier) {
      throw new Error("Could not find matching seat tier for this ticket. Please try again.");
    }
    return matchingTier.publicKey;
  };

  const handleRefund = async () => {
    if (isCancelledEvent) {
      // Auto-refund for cancelled events — no admin approval needed
      Alert.alert(
        "Claim Refund",
        `Claim your refund of ${formatSOL(refundAmount)} SOL? The event was cancelled and you'll receive your SOL back immediately.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Claim Refund",
            onPress: async () => {
              setProcessing(true);
              try {
                const seatTierPda = await resolveSeatTierPda();
                await apiClaimCancellationRefund({
                  eventPda: ticket.eventKey,
                  ticketMint: ticket.mint,
                  seatTierPda,
                });
                Alert.alert(
                  "Refund Claimed",
                  "Your refund has been processed. The SOL has been returned to your wallet.",
                  [{ text: "OK", onPress: () => router.back() }]
                );
              } catch (error: any) {
                const msg = error.message ?? "Failed to claim refund.";
                if (msg.includes("RefundWindowClosed")) {
                  Alert.alert("Refund Window Closed", "The refund deadline for this cancelled event has passed.");
                } else {
                  Alert.alert("Refund Failed", msg);
                }
              } finally {
                setProcessing(false);
              }
            },
          },
        ]
      );
    } else {
      // Regular refund request — needs admin approval
      Alert.alert(
        "Request Refund",
        `Submit a refund request for ${formatSOL(refundAmount)} SOL? The event admin will review and approve or reject your request.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Submit Request",
            style: "destructive",
            onPress: async () => {
              setProcessing(true);
              try {
                await apiRequestRefund({
                  eventPda: ticket.eventKey,
                  ticketMint: ticket.mint,
                });
                Alert.alert(
                  "Refund Requested",
                  "Your refund request has been submitted. The event admin will review it shortly.",
                  [{ text: "OK", onPress: () => router.back() }]
                );
              } catch (error: any) {
                const msg = error.message ?? "Failed to submit refund request.";
                if (msg.includes("RefundWindowClosed")) {
                  Alert.alert("Refund Window Closed", "The refund deadline for this event has passed.");
                } else if (msg.includes("TicketAlreadyCheckedIn")) {
                  Alert.alert("Cannot Refund", "This ticket has already been checked in.");
                } else {
                  Alert.alert("Refund Failed", msg);
                }
              } finally {
                setProcessing(false);
              }
            },
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Refund</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Ticket Details */}
        <Text style={styles.sectionLabel}>TICKET DETAILS</Text>
        <View style={styles.card}>
          <View style={styles.itemRow}>
            <LinearGradient
              colors={["#FF4757", "#FF6B81"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nftImage}
            >
              <Ionicons name="ticket" size={32} color={colors.text} />
            </LinearGradient>
            <View style={styles.itemInfo}>
              <Text style={styles.eventName} numberOfLines={2}>
                {event.name}
              </Text>
              <View style={styles.venueRow}>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={colors.textMuted}
                />
                <Text style={styles.venueText} numberOfLines={1}>
                  {event.venue}
                </Text>
              </View>
              <Text style={styles.seatText}>
                Seat #{ticket.seatNumber}
              </Text>
            </View>
          </View>
        </View>

        {/* Refund Summary */}
        <Text style={styles.sectionLabel}>REFUND SUMMARY</Text>
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Price Paid</Text>
            <Text style={styles.summaryValue}>
              {formatSOL(refundAmount)} SOL
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Refund Amount</Text>
            <Text style={styles.totalValue}>
              {formatSOL(refundAmount)} SOL
            </Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons
              name="information-circle"
              size={22}
              color={colors.primary}
            />
            <Text style={styles.infoTitle}>
              {isCancelledEvent ? "Cancellation Refund" : "How Refunds Work"}
            </Text>
          </View>
          <Text style={styles.infoBody}>
            {isCancelledEvent
              ? "This event has been cancelled by the organizer. You are eligible for an automatic refund. Click the button below to claim your SOL back instantly — no admin approval needed."
              : "Your refund request will be reviewed by the event admin. If approved, the SOL will be returned to your wallet and your ticket will be invalidated. Refund requests can only be submitted before the refund deadline and for tickets that haven't been checked in."}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.refundButton,
            processing && styles.refundButtonDisabled,
          ]}
          onPress={handleRefund}
          disabled={processing}
          activeOpacity={0.8}
        >
          {processing ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <>
              <Ionicons
                name="return-down-back"
                size={20}
                color={colors.text}
                style={styles.buttonIcon}
              />
              <Text style={styles.refundButtonText}>
                {isCancelledEvent ? "Claim Refund Now" : "Submit Refund Request"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={processing}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: spacing.md,
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
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  errorText: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  nftImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
    marginLeft: 14,
  },
  eventName: {
    fontSize: 16,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    marginBottom: 4,
  },
  venueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  venueText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
    flex: 1,
  },
  seatText: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.primary,
  },
  infoCard: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.md,
    marginTop: 20,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoTitle: {
    fontSize: 15,
    fontFamily: fonts.headingSemiBold,
    color: colors.primary,
  },
  infoBody: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  refundButton: {
    backgroundColor: colors.error,
    borderRadius: 14,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  refundButtonDisabled: {
    opacity: 0.5,
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  refundButtonText: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  cancelButton: {
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.transparent,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: fonts.headingSemiBold,
    color: colors.textSecondary,
  },
});
