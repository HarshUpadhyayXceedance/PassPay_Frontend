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
import { apiRefundTicket } from "../../services/api/eventApi";
import { formatSOL } from "../../utils/formatters";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";

const NETWORK_FEE = 0.000005;

export function RefundRequestScreen() {
  const router = useRouter();
  const { ticketKey } = useLocalSearchParams<{ ticketKey: string }>();
  const { tickets } = useTickets();
  const { getEvent } = useEvents();
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

  const ticketPrice = event.ticketPrice;
  const refundEstimate = ticketPrice - NETWORK_FEE;

  const handleRefund = async () => {
    Alert.alert(
      "Confirm Refund",
      "Are you sure you want to refund this ticket? This action is irreversible and your ticket NFT will be burned.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async () => {
            setProcessing(true);
            try {
              await apiRefundTicket({
                eventPda: ticket.eventKey,
                ticketMint: ticket.mint,
              });
              Alert.alert(
                "Refund Confirmed",
                "Your ticket has been refunded successfully. The SOL has been returned to your wallet.",
                [{ text: "OK", onPress: () => router.back() }]
              );
            } catch (error: any) {
              Alert.alert(
                "Refund Failed",
                error.message ?? "Failed to process refund. Please try again."
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
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
            <Text style={styles.summaryLabel}>Original Ticket Price</Text>
            <Text style={styles.summaryValue}>
              {formatSOL(ticketPrice)} SOL
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.networkFeeLabel}>
              <Text style={styles.summaryLabel}>Network Fee</Text>
              <View style={styles.solanaBadge}>
                <Text style={styles.solanaBadgeText}>Solana</Text>
              </View>
            </View>
            <Text style={styles.summaryValue}>
              -{formatSOL(NETWORK_FEE)} SOL
            </Text>
          </View>
          <View style={styles.feeNotice}>
            <Ionicons
              name="information-circle-outline"
              size={14}
              color={colors.textMuted}
            />
            <Text style={styles.feeNoticeText}>
              Network fees are non-refundable
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Estimated Refund</Text>
            <Text style={styles.totalValue}>
              {formatSOL(refundEstimate)} SOL
            </Text>
          </View>
        </View>

        {/* Warning Section */}
        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons
              name="warning"
              size={22}
              color={colors.warning}
            />
            <Text style={styles.warningTitle}>Important Notice</Text>
          </View>
          <Text style={styles.warningBody}>
            This action is irreversible. Your ticket NFT will be burned and you
            will lose access to the event. The refund amount will be returned to
            your wallet after the transaction is confirmed on-chain.
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
              <Text style={styles.refundButtonText}>Confirm Refund</Text>
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
  networkFeeLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  solanaBadge: {
    backgroundColor: colors.secondaryMuted,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  solanaBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
    color: colors.secondary,
  },
  feeNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  feeNoticeText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
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
  warningCard: {
    backgroundColor: colors.errorLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.error,
    padding: spacing.md,
    marginTop: 20,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  warningTitle: {
    fontSize: 15,
    fontFamily: fonts.headingSemiBold,
    color: colors.warning,
  },
  warningBody: {
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
