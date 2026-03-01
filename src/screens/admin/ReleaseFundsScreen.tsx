import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PublicKey } from "@solana/web3.js";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing, borderRadius } from "../../theme/spacing";
import { useEvents } from "../../hooks/useEvents";
import { useWallet } from "../../hooks/useWallet";
import { apiReleaseFunds } from "../../services/api/eventApi";
import { getProgram } from "../../solana/config/program";
import { getConnection } from "../../solana/config/connection";
import { createProvider } from "../../solana/wallet/walletSession";
import { phantomWalletAdapter } from "../../solana/wallet/phantomWalletAdapter";
import { findEscrowPda, findEscrowVaultPda } from "../../solana/pda";
import { formatSOL, shortenAddress } from "../../utils/formatters";
import { showSuccess, showWarning, showInfo, showError } from "../../utils/alerts";
import { confirm } from "../../components/ui/ConfirmDialogProvider";

export function ReleaseFundsScreen() {
  const router = useRouter();
  const { eventKey } = useLocalSearchParams<{ eventKey: string }>();
  const { getEvent } = useEvents();
  const { publicKey } = useWallet();

  const [isReleasing, setIsReleasing] = useState(false);
  const [escrowBalance, setEscrowBalance] = useState<number | null>(null);
  const [escrowData, setEscrowData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const event = eventKey ? getEvent(eventKey) : undefined;

  useEffect(() => {
    async function fetchEscrowData() {
      if (!eventKey) return;
      try {
        // Use connected wallet if available, otherwise read-only provider
        const wallet = phantomWalletAdapter;
        let provider;
        try {
          if (wallet.getPublicKey()) {
            provider = createProvider(wallet);
          } else {
            const { AnchorProvider } = require("@coral-xyz/anchor");
            const conn = getConnection();
            provider = new AnchorProvider(conn, {
              publicKey: new PublicKey("11111111111111111111111111111111"),
              signTransaction: async () => { throw new Error("Read-only"); },
              signAllTransactions: async () => { throw new Error("Read-only"); },
            }, { commitment: "confirmed" });
          }
        } catch {
          const { AnchorProvider } = require("@coral-xyz/anchor");
          const conn = getConnection();
          provider = new AnchorProvider(conn, {
            publicKey: new PublicKey("11111111111111111111111111111111"),
            signTransaction: async () => { throw new Error("Read-only"); },
            signAllTransactions: async () => { throw new Error("Read-only"); },
          }, { commitment: "confirmed" });
        }
        const program = getProgram(provider);

        const eventPubkey = new PublicKey(eventKey);
        const [escrowPda] = findEscrowPda(eventPubkey);
        const [escrowVaultPda] = findEscrowVaultPda(eventPubkey);

        const escrow = await program.account.eventEscrow.fetchNullable(escrowPda);
        const vaultBalance = await provider.connection.getBalance(escrowVaultPda);

        setEscrowData(escrow);
        setEscrowBalance(vaultBalance);
      } catch (err: any) {
        console.error("Failed to fetch escrow:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEscrowData();
  }, [eventKey]);

  const isEventPast = event ? new Date(event.eventDate) < new Date() : false;
  const isAlreadyReleased = escrowData?.isReleased ?? false;
  const canRelease = isEventPast && !isAlreadyReleased && (escrowBalance ?? 0) > 0;
  const escrowBalanceSOL = (escrowBalance ?? 0) / 1_000_000_000;
  const totalCollectedSOL = escrowData
    ? escrowData.totalCollected.toNumber() / 1_000_000_000
    : 0;
  const totalRefundedSOL = escrowData
    ? escrowData.totalRefunded.toNumber() / 1_000_000_000
    : 0;

  const handleRelease = async () => {
    if (!canRelease) return;

    confirm({
      title: "Release Escrow Funds",
      message: `Release ${formatSOL(escrowBalanceSOL)} SOL from escrow to the event creator's wallet?\n\nThis action is irreversible.`,
      type: "danger",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        {
          text: "Release Funds",
          style: "destructive",
          onPress: async () => {
            setIsReleasing(true);
            try {
              const signature = await apiReleaseFunds({
                eventPda: eventKey!,
                eventCreator: event!.admin,
              });
              showSuccess("Funds Released", `${formatSOL(escrowBalanceSOL)} SOL has been released to the event creator.\n\nSignature: ${signature.slice(0, 16)}...`);
              router.back();
            } catch (err: any) {
              const msg = err.message || "Failed to release funds";
              if (msg.includes("EscrowNotReleasable")) {
                showWarning("Too Early", "Funds can only be released after the event date.");
              } else if (msg.includes("CancellationRefundWindowOpen")) {
                showWarning("Refund Window Open", "This event was cancelled. Funds cannot be released until the refund window closes (30 days).");
              } else if (msg.includes("EscrowAlreadyReleased")) {
                showInfo("Already Released", "Escrow funds have already been released.");
              } else {
                showError("Error", msg);
              }
            } finally {
              setIsReleasing(false);
            }
          },
        },
      ],
    });
  };

  if (!event) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Release Funds</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>Event not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Release Funds</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Event & Escrow Summary */}
        <LinearGradient
          colors={colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCardGradient}
        >
          <View style={styles.balanceCardInner}>
            <Text style={styles.eventName}>{event.name}</Text>

            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Escrow Balance</Text>
                <Text style={[styles.balanceValue, styles.balanceHighlight]}>
                  {loading ? "..." : `${formatSOL(escrowBalanceSOL)} SOL`}
                </Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Total Collected</Text>
                <Text style={styles.balanceValue}>
                  {loading ? "..." : `${formatSOL(totalCollectedSOL)} SOL`}
                </Text>
              </View>
            </View>

            <View style={styles.ticketsSummary}>
              <Ionicons name="ticket-outline" size={16} color={colors.primaryLight} />
              <Text style={styles.ticketsSummaryText}>
                {event.ticketsSold} / {event.totalSeats} tickets sold
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Escrow Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Escrow Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Collected</Text>
            <Text style={styles.detailValue}>
              {loading ? "..." : `${formatSOL(totalCollectedSOL)} SOL`}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Refunded</Text>
            <Text style={styles.detailValue}>
              {loading ? "..." : `${formatSOL(totalRefundedSOL)} SOL`}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Balance</Text>
            <Text style={[styles.detailValue, { color: colors.primary }]}>
              {loading ? "..." : `${formatSOL(escrowBalanceSOL)} SOL`}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={[styles.detailValue, {
              color: isAlreadyReleased ? colors.success : isEventPast ? colors.warning : colors.textMuted
            }]}>
              {isAlreadyReleased ? "Released" : isEventPast ? "Ready to Release" : "Locked (Event Pending)"}
            </Text>
          </View>
        </View>

        {/* Destination */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Destination</Text>
          <View style={styles.destinationRow}>
            <View style={styles.walletIconContainer}>
              <Ionicons name="wallet-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.destinationInfo}>
              <Text style={styles.walletAddress}>
                {event?.admin ? shortenAddress(event.admin, 8) : "Unknown"}
              </Text>
              <Text style={styles.destinationHint}>
                Funds go to the event creator's wallet
              </Text>
            </View>
          </View>
        </View>

        {/* Status Messages */}
        {!isEventPast && (
          <View style={styles.warningCard}>
            <Ionicons name="time-outline" size={20} color={colors.warning} />
            <Text style={styles.warningText}>
              Funds can only be released after the event date ({new Date(event.eventDate).toLocaleDateString()}).
            </Text>
          </View>
        )}

        {isAlreadyReleased && (
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.successText}>
              Escrow funds have already been released.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (!canRelease || isReleasing || loading) && styles.confirmButtonDisabled,
          ]}
          onPress={handleRelease}
          disabled={!canRelease || isReleasing || loading}
          activeOpacity={0.8}
        >
          {isReleasing ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <>
              <Ionicons name="arrow-down-circle-outline" size={20} color={colors.background} />
              <Text style={styles.confirmButtonText}>
                {isAlreadyReleased ? "Already Released" : !isEventPast ? "Event Not Over" : "Release Funds"}
              </Text>
            </>
          )}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
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
  balanceCardGradient: {
    borderRadius: borderRadius.lg,
    padding: 1.5,
    marginBottom: spacing.lg,
  },
  balanceCardInner: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg - 1,
    padding: spacing.lg,
  },
  eventName: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: spacing.md,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  balanceItem: {
    flex: 1,
  },
  balanceDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  balanceLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  balanceHighlight: {
    color: colors.primary,
  },
  ticketsSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ticketsSummaryText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: fonts.headingSemiBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
  destinationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  walletIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  destinationInfo: {
    flex: 1,
  },
  walletAddress: {
    fontSize: 15,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
    marginBottom: 2,
  },
  destinationHint: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  successCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.surfaceLight,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.background,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
});
