import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { PublicKey } from "@solana/web3.js";
import { Ionicons } from "@expo/vector-icons";
import { AppHeader } from "../../components/ui/AppHeader";
import { AppCard } from "../../components/ui/AppCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { apiApproveRefund, apiRejectRefund } from "../../services/api/eventApi";
import { getConnection } from "../../solana/config/connection";
import { PROGRAM_ID, TICKET_SEED } from "../../solana/config/constants";
import { findTicketPda } from "../../solana/pda";
import { useMerchants } from "../../hooks/useMerchants";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing, borderRadius } from "../../theme/spacing";
import { showSuccess, showError } from "../../utils/alerts";
import { confirm } from "../../components/ui/ConfirmDialogProvider";

type RefundStatusKey = "Pending" | "Approved" | "Rejected";

interface RefundItem {
  publicKey: string;
  event: string;
  ticketMint: string;
  holder: string;
  amount: number;
  status: RefundStatusKey;
  requestedAt: number;
  processedAt: number;
}

function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

const STATUS_CONFIG: Record<
  RefundStatusKey,
  { color: string; bgColor: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  Pending: {
    color: colors.warning,
    bgColor: colors.warningLight,
    icon: "time-outline",
  },
  Approved: {
    color: colors.success,
    bgColor: colors.successLight,
    icon: "checkmark-circle-outline",
  },
  Rejected: {
    color: colors.error,
    bgColor: colors.errorLight,
    icon: "close-circle-outline",
  },
};

const REFUND_REQUEST_DISCRIMINATOR = [40, 79, 128, 211, 184, 96, 201, 204];

function readU64LE(data: Uint8Array, offset: number): number {
  let val = 0;
  for (let i = 7; i >= 0; i--) {
    val = val * 256 + data[offset + i];
  }
  return val;
}

function readI64LE(data: Uint8Array, offset: number): number {
  return readU64LE(data, offset);
}

function readPubkey(data: Uint8Array, offset: number): string {
  return new PublicKey(data.slice(offset, offset + 32)).toBase58();
}

function parseRefundAccount(pubkey: PublicKey, data: Uint8Array): RefundItem | null {
  if (data.length < 130) return null;

  for (let i = 0; i < 8; i++) {
    if (data[i] !== REFUND_REQUEST_DISCRIMINATOR[i]) return null;
  }
  const statusByte = data[112];
  const statusMap: Record<number, RefundStatusKey> = { 0: "Pending", 1: "Approved", 2: "Rejected" };
  return {
    publicKey: pubkey.toBase58(),
    event: readPubkey(data, 8),
    ticketMint: readPubkey(data, 40),
    holder: readPubkey(data, 72),
    amount: readU64LE(data, 104),
    status: statusMap[statusByte] ?? "Pending",
    requestedAt: readI64LE(data, 113),
    processedAt: readI64LE(data, 121),
  };
}

export function RefundManagementScreen() {
  const router = useRouter();
  const { eventKey } = useLocalSearchParams<{ eventKey: string }>();
  const { seatTiers, fetchSeatTiers } = useMerchants();
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRefunds = useCallback(async () => {
    setError(null);
    try {


      const connection = getConnection();
      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [{ dataSize: 130 }],
      });

      const items: RefundItem[] = [];
      for (const { pubkey, account } of accounts) {
        const parsed = parseRefundAccount(pubkey, account.data as Uint8Array);
        if (!parsed) continue;

        if (eventKey && parsed.event !== eventKey) continue;
        items.push(parsed);
      }


      items.sort((a, b) => {
        if (a.status === "Pending" && b.status !== "Pending") return -1;
        if (a.status !== "Pending" && b.status === "Pending") return 1;
        return b.requestedAt - a.requestedAt;
      });

      setRefunds(items);
    } catch (err: any) {
      console.error("Failed to fetch refunds:", err);
      const errorMsg = err.message || "Failed to load refund requests";
      setError(errorMsg);
      showError("Error Loading Refunds", errorMsg);
    } finally {
      setLoading(false);
    }
  }, [eventKey]);

  useEffect(() => {
    fetchRefunds();
    if (eventKey) fetchSeatTiers(eventKey);
  }, [fetchRefunds, eventKey]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRefunds();
    setRefreshing(false);
  }, [fetchRefunds]);

  const pendingRefunds = refunds.filter((r) => r.status === "Pending");
  const processedRefunds = refunds.filter((r) => r.status !== "Pending");


  const resolveSeatTierPda = useCallback(
    async (item: RefundItem): Promise<string> => {
      const connection = getConnection();
      const eventPubkey = new PublicKey(item.event);
      const mintPubkey = new PublicKey(item.ticketMint);
      const [ticketPda] = findTicketPda(eventPubkey, mintPubkey);



      const ticketInfo = await connection.getAccountInfo(ticketPda);
      if (!ticketInfo || !ticketInfo.data) {
        throw new Error("Ticket account not found");
      }
      const data = ticketInfo.data as Uint8Array;
      const tierLevel = data[8 + 32 + 32 + 32 + 4];


      await fetchSeatTiers(item.event);
      const eventTiers = seatTiers.filter((t) => t.eventKey === item.event);
      const matchingTier = eventTiers.find((t) => t.tierLevel === tierLevel);
      if (!matchingTier) {
        throw new Error("Could not find matching seat tier for this ticket");
      }
      return matchingTier.publicKey;
    },
    [seatTiers, fetchSeatTiers]
  );

  const handleApprove = useCallback(
    (item: RefundItem) => {
      confirm({
        title: "Approve Refund",
        message: `Approve refund of ${(item.amount / 1_000_000_000).toFixed(4)} SOL to ${shortenAddress(item.holder)}?`,
        type: "default",
        buttons: [
          { text: "Cancel", style: "cancel", onPress: () => {} },
          {
            text: "Approve",
            style: "default",
            onPress: async () => {
              setProcessingId(item.publicKey);
              try {
                const seatTierPda = await resolveSeatTierPda(item);
                await apiApproveRefund({
                  eventPda: item.event,
                  ticketMint: item.ticketMint,
                  holder: item.holder,
                  seatTierPda,
                });
                showSuccess("Approved", "Refund has been approved and SOL transferred.");
                await fetchRefunds();
              } catch (err: any) {
                showError("Error", err.message || "Failed to approve refund");
              } finally {
                setProcessingId(null);
              }
            },
          },
        ],
      });
    },
    [fetchRefunds, resolveSeatTierPda]
  );

  const handleReject = useCallback(
    (item: RefundItem) => {
      confirm({
        title: "Reject Refund",
        message: `Reject refund request from ${shortenAddress(item.holder)}?`,
        type: "danger",
        buttons: [
          { text: "Cancel", style: "cancel", onPress: () => {} },
          {
            text: "Reject",
            style: "destructive",
            onPress: async () => {
              setProcessingId(item.publicKey);
              try {
                await apiRejectRefund({
                  eventPda: item.event,
                  ticketMint: item.ticketMint,
                });
                showSuccess("Rejected", "Refund request has been rejected.");
                await fetchRefunds();
              } catch (err: any) {
                showError("Error", err.message || "Failed to reject refund");
              } finally {
                setProcessingId(null);
              }
            },
          },
        ],
      });
    },
    [fetchRefunds]
  );

  const renderRefundCard = ({ item }: { item: RefundItem }) => {
    const statusConfig = STATUS_CONFIG[item.status];
    const isPending = item.status === "Pending";
    const isProcessing = processingId === item.publicKey;
    const amountSOL = item.amount / 1_000_000_000;
    const requestedDate = new Date(item.requestedAt * 1000).toLocaleDateString();

    return (
      <AppCard style={styles.refundCard}>
        <View style={styles.cardHeader}>
          <View style={styles.holderRow}>
            <Ionicons
              name="person-outline"
              size={18}
              color={colors.textSecondary}
            />
            <Text style={styles.holderText}>{shortenAddress(item.holder)}</Text>
          </View>
          <View
            style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}
          >
            <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <Ionicons
              name="wallet-outline"
              size={16}
              color={colors.textMuted}
            />
            <Text style={styles.amountText}>{amountSOL.toFixed(4)} SOL</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons
              name="key-outline"
              size={16}
              color={colors.textMuted}
            />
            <Text style={styles.mintText}>{shortenAddress(item.ticketMint, 6)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons
              name="time-outline"
              size={16}
              color={colors.textMuted}
            />
            <Text style={styles.dateText}>Requested: {requestedDate}</Text>
          </View>
        </View>

        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.approveButton, isProcessing && { opacity: 0.5 }]}
              onPress={() => handleApprove(item)}
              activeOpacity={0.7}
              disabled={isProcessing}
            >
              <Ionicons name="checkmark-outline" size={18} color={colors.white} />
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectButton, isProcessing && { opacity: 0.5 }]}
              onPress={() => handleReject(item)}
              activeOpacity={0.7}
              disabled={isProcessing}
            >
              <Ionicons name="close-outline" size={18} color={colors.error} />
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </AppCard>
    );
  };

  const allRefunds = [...pendingRefunds, ...processedRefunds];

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Refund Management" onBack={() => router.back()} />
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Refund Management"
        onBack={() => router.back()}
      />
      <FlatList
        data={allRefunds}
        renderItem={renderRefundCard}
        keyExtractor={(item) => item.publicKey}
        contentContainerStyle={[
          styles.list,
          allRefunds.length === 0 && styles.emptyList,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          allRefunds.length > 0 ? (
            <View style={styles.summaryBar}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryCount}>{pendingRefunds.length}</Text>
                <Text style={styles.summaryLabel}>Pending</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryCount}>
                  {refunds.filter((r) => r.status === "Approved").length}
                </Text>
                <Text style={styles.summaryLabel}>Approved</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryCount}>
                  {refunds.filter((r) => r.status === "Rejected").length}
                </Text>
                <Text style={styles.summaryLabel}>Rejected</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning-outline" size={48} color={colors.error} />
              <Text style={styles.errorTitle}>Failed to Load</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <EmptyState
              icon="receipt-outline"
              title="No refund requests"
              message="No refund requests found for this event. They will appear here when users request refunds."
            />
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
    paddingTop: 60,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyList: {
    flex: 1,
  },
  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryCount: {
    fontSize: 22,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  refundCard: {
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  holderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  holderText: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },
  cardBody: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  amountText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },
  mintText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  dateText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  approveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.success,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  approveButtonText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.white,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.transparent,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  rejectButtonText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.error,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.error,
  },
  errorMessage: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  retryText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.white,
  },
});
