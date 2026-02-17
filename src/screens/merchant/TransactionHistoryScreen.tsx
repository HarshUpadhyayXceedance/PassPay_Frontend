import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing, borderRadius } from "../../theme/spacing";
import { AppHeader } from "../../components/ui/AppHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatSOL, shortenAddress } from "../../utils/formatters";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TransactionStatus = "completed" | "pending" | "failed";
type FilterTab = "all" | "today" | "week";

interface Transaction {
  id: string;
  type: "payment";
  customerAddress: string;
  amount: number; // SOL
  eventName: string;
  timestamp: Date;
  status: TransactionStatus;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLOR: Record<TransactionStatus, string> = {
  completed: colors.success,
  pending: colors.warning,
  failed: colors.error,
};

const STATUS_LABEL: Record<TransactionStatus, string> = {
  completed: "Completed",
  pending: "Pending",
  failed: "Failed",
};

function hoursAgo(h: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function timeAgo(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

function isWithinLastWeek(date: Date): boolean {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  return date >= oneWeekAgo;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "tx_001",
    type: "payment",
    customerAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    amount: 0.15,
    eventName: "Solana Hacker House NYC",
    timestamp: hoursAgo(1),
    status: "completed",
  },
  {
    id: "tx_002",
    type: "payment",
    customerAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    amount: 0.5,
    eventName: "Solana Hacker House NYC",
    timestamp: hoursAgo(3),
    status: "completed",
  },
  {
    id: "tx_003",
    type: "payment",
    customerAddress: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    amount: 0.08,
    eventName: "ETH Denver After-Party",
    timestamp: hoursAgo(5),
    status: "pending",
  },
  {
    id: "tx_004",
    type: "payment",
    customerAddress: "HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH",
    amount: 1.2,
    eventName: "Solana Hacker House NYC",
    timestamp: hoursAgo(18),
    status: "completed",
  },
  {
    id: "tx_005",
    type: "payment",
    customerAddress: "3Kgx3sWRmPQYgMAxqA6NrPjbcCAr1VRcrMKqz8LRcFAP",
    amount: 0.05,
    eventName: "Breakpoint 2025 Merch Booth",
    timestamp: daysAgo(2),
    status: "failed",
  },
  {
    id: "tx_006",
    type: "payment",
    customerAddress: "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
    amount: 2.0,
    eventName: "Breakpoint 2025 Merch Booth",
    timestamp: daysAgo(3),
    status: "completed",
  },
  {
    id: "tx_007",
    type: "payment",
    customerAddress: "BPFLoaderUpgradeab1e11111111111111111111111",
    amount: 0.35,
    eventName: "Solana Hacker House NYC",
    timestamp: daysAgo(5),
    status: "completed",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TransactionHistoryScreen() {
  const router = useRouter();
  const [transactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [refreshing, setRefreshing] = useState(false);

  // ----- Filtering -----

  const filtered = useMemo(() => {
    switch (activeFilter) {
      case "today":
        return transactions.filter((tx) => isToday(tx.timestamp));
      case "week":
        return transactions.filter((tx) => isWithinLastWeek(tx.timestamp));
      default:
        return transactions;
    }
  }, [transactions, activeFilter]);

  // ----- Summary calculations -----

  const todayEarnings = useMemo(
    () =>
      transactions
        .filter((tx) => isToday(tx.timestamp) && tx.status === "completed")
        .reduce((sum, tx) => sum + tx.amount, 0),
    [transactions]
  );

  const weekEarnings = useMemo(
    () =>
      transactions
        .filter(
          (tx) => isWithinLastWeek(tx.timestamp) && tx.status === "completed"
        )
        .reduce((sum, tx) => sum + tx.amount, 0),
    [transactions]
  );

  const totalCount = transactions.length;

  // ----- Refresh -----

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // ----- Transaction detail alert -----

  const showDetail = useCallback((tx: Transaction) => {
    const dateStr = tx.timestamp.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    Alert.alert(
      "Transaction Details",
      [
        `ID: ${tx.id}`,
        `Customer: ${shortenAddress(tx.customerAddress, 6)}`,
        `Amount: ${formatSOL(tx.amount)} SOL`,
        `Event: ${tx.eventName}`,
        `Date: ${dateStr}`,
        `Status: ${STATUS_LABEL[tx.status]}`,
      ].join("\n"),
      [{ text: "Close", style: "cancel" }]
    );
  }, []);

  // ----- Filter tabs -----

  const FILTERS: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
  ];

  // ----- Render helpers -----

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const statusColor = STATUS_COLOR[item.status];
    const amountColor =
      item.status === "completed"
        ? colors.success
        : item.status === "pending"
          ? colors.warning
          : colors.error;

    return (
      <TouchableOpacity
        style={styles.txRow}
        activeOpacity={0.7}
        onPress={() => showDetail(item)}
      >
        {/* Left icon */}
        <View style={[styles.txIcon, { backgroundColor: amountColor + "18" }]}>
          <Ionicons
            name={
              item.status === "completed"
                ? "checkmark-circle"
                : item.status === "pending"
                  ? "time"
                  : "close-circle"
            }
            size={22}
            color={amountColor}
          />
        </View>

        {/* Middle: customer + event */}
        <View style={styles.txInfo}>
          <Text style={styles.txCustomer} numberOfLines={1}>
            {shortenAddress(item.customerAddress)}
          </Text>
          <Text style={styles.txEvent} numberOfLines={1}>
            {item.eventName}
          </Text>
        </View>

        {/* Right: amount + time + status */}
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, { color: amountColor }]}>
            +{formatSOL(item.amount)} SOL
          </Text>
          <View style={styles.txMeta}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.txTime}>{timeAgo(item.timestamp)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Summary Card */}
      <LinearGradient
        colors={[colors.secondary + "25", colors.secondaryDark + "15"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <View style={styles.summaryAccent} />
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Today</Text>
            <Text style={styles.summaryValue}>
              {formatSOL(todayEarnings)} SOL
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>This Week</Text>
            <Text style={styles.summaryValue}>
              {formatSOL(weekEarnings)} SOL
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Txns</Text>
            <Text style={styles.summaryValue}>{totalCount}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setActiveFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterLabel,
                  isActive && styles.filterLabelActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // ----- Main render -----

  return (
    <View style={styles.container}>
      <AppHeader
        title="Transaction History"
        onBack={() => router.back()}
        rightAction={
          <TouchableOpacity onPress={onRefresh}>
            <Ionicons name="refresh" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No Transactions"
            message={
              activeFilter === "today"
                ? "No transactions recorded today. They will appear here as customers make payments."
                : activeFilter === "week"
                  ? "No transactions this week. Start accepting payments to see activity."
                  : "No transaction history yet. Payments from customers will show up here."
            }
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },

  // Summary card
  summaryCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.secondary + "30",
    overflow: "hidden",
  },
  summaryAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.secondary,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },

  // Filter tabs
  filterRow: {
    flexDirection: "row",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  filterLabel: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
  },
  filterLabelActive: {
    color: colors.primary,
  },

  // Transaction row
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  txInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  txCustomer: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
    marginBottom: 2,
  },
  txEvent: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  txRight: {
    alignItems: "flex-end",
  },
  txAmount: {
    fontSize: 15,
    fontFamily: fonts.heading,
    marginBottom: 2,
  },
  txMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  txTime: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },

  // Separator
  separator: {
    height: spacing.sm,
  },
});
