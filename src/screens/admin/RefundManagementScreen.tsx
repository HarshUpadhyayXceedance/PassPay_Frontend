import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppHeader } from "../../components/ui/AppHeader";
import { AppCard } from "../../components/ui/AppCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { useEvents } from "../../hooks/useEvents";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing, borderRadius } from "../../theme/spacing";

type RefundStatus = "Pending" | "Approved" | "Rejected";

interface RefundRequest {
  id: string;
  ticketHolder: string;
  eventName: string;
  amountSOL: number;
  status: RefundStatus;
  requestedAt: string;
}

const INITIAL_REFUNDS: RefundRequest[] = [
  {
    id: "refund-001",
    ticketHolder: "7xKq...R3mN",
    eventName: "Solana Hacker House NYC",
    amountSOL: 0.5,
    status: "Pending",
    requestedAt: "2025-12-20",
  },
  {
    id: "refund-002",
    ticketHolder: "4bTz...Vw8P",
    eventName: "DeFi Summit 2025",
    amountSOL: 1.2,
    status: "Pending",
    requestedAt: "2025-12-19",
  },
  {
    id: "refund-003",
    ticketHolder: "9nFe...Lk2J",
    eventName: "NFT Art Basel Afterparty",
    amountSOL: 0.75,
    status: "Approved",
    requestedAt: "2025-12-18",
  },
];

const STATUS_CONFIG: Record<
  RefundStatus,
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

export function RefundManagementScreen() {
  const router = useRouter();
  const { fetchEvents, isLoading } = useEvents();
  const [refunds, setRefunds] = useState<RefundRequest[]>(INITIAL_REFUNDS);
  const [refreshing, setRefreshing] = useState(false);

  const pendingRefunds = refunds.filter((r) => r.status === "Pending");
  const processedRefunds = refunds.filter((r) => r.status !== "Pending");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
    // In a real implementation, we'd fetch refund requests from the backend here
    setRefreshing(false);
  }, [fetchEvents]);

  const handleApprove = useCallback(
    (id: string) => {
      const refund = refunds.find((r) => r.id === id);
      if (!refund) return;

      Alert.alert(
        "Approve Refund",
        `Approve refund of ${refund.amountSOL} SOL to ${refund.ticketHolder}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Approve",
            onPress: () => {
              setRefunds((prev) =>
                prev.map((r) =>
                  r.id === id ? { ...r, status: "Approved" as RefundStatus } : r
                )
              );
            },
          },
        ]
      );
    },
    [refunds]
  );

  const handleReject = useCallback(
    (id: string) => {
      const refund = refunds.find((r) => r.id === id);
      if (!refund) return;

      Alert.alert(
        "Reject Refund",
        `Reject refund request from ${refund.ticketHolder}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reject",
            style: "destructive",
            onPress: () => {
              setRefunds((prev) =>
                prev.map((r) =>
                  r.id === id ? { ...r, status: "Rejected" as RefundStatus } : r
                )
              );
            },
          },
        ]
      );
    },
    [refunds]
  );

  const renderRefundCard = ({ item }: { item: RefundRequest }) => {
    const statusConfig = STATUS_CONFIG[item.status];
    const isPending = item.status === "Pending";

    return (
      <AppCard style={styles.refundCard}>
        <View style={styles.cardHeader}>
          <View style={styles.holderRow}>
            <Ionicons
              name="person-outline"
              size={18}
              color={colors.textSecondary}
            />
            <Text style={styles.holderText}>{item.ticketHolder}</Text>
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
              name="calendar-outline"
              size={16}
              color={colors.textMuted}
            />
            <Text style={styles.eventName}>{item.eventName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons
              name="wallet-outline"
              size={16}
              color={colors.textMuted}
            />
            <Text style={styles.amountText}>{item.amountSOL} SOL</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons
              name="time-outline"
              size={16}
              color={colors.textMuted}
            />
            <Text style={styles.dateText}>Requested: {item.requestedAt}</Text>
          </View>
        </View>

        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.approveButton}
              onPress={() => handleApprove(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-outline" size={18} color={colors.white} />
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleReject(item.id)}
              activeOpacity={0.7}
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

  return (
    <View style={styles.container}>
      <AppHeader
        title="Refund Management"
        onBack={() => router.back()}
      />
      <FlatList
        data={allRefunds}
        renderItem={renderRefundCard}
        keyExtractor={(item) => item.id}
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
          <EmptyState
            icon="receipt-outline"
            title="No pending refunds"
            message="All refund requests have been processed. New requests will appear here."
          />
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
  eventName: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  amountText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
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
});
