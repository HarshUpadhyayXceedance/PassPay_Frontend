import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PublicKey, ParsedTransactionWithMeta } from "@solana/web3.js";
import * as Haptics from "expo-haptics";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing, borderRadius } from "../../theme/spacing";
import { AppHeader } from "../../components/ui/AppHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatSOL, shortenAddress, lamportsToSOL } from "../../utils/formatters";
import { getConnection } from "../../solana/config/connection";
import { getTxUrl } from "../../solana/utils/explorer";
import { useWallet } from "../../hooks/useWallet";
import { useMerchants } from "../../hooks/useMerchants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterTab = "all" | "today" | "week";

interface MerchantTransaction {
  signature: string;
  customerAddress: string;
  amount: number; // SOL
  merchantName: string;
  timestamp: Date;
  status: "confirmed" | "failed";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Delay helper for rate-limiting RPC calls */
function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Parse a confirmed transaction to extract pay_merchant details.
 * Returns null if the transaction isn't a pay_merchant call or can't be parsed.
 */
function parseMerchantPayment(
  tx: ParsedTransactionWithMeta,
  signature: string,
  merchantWallet: string,
  merchantName: string
): MerchantTransaction | null {
  if (!tx || !tx.meta) return null;
  if (tx.meta.err) {
    // Failed transaction — still show it
    const ts = tx.blockTime ? new Date(tx.blockTime * 1000) : new Date();
    return {
      signature,
      customerAddress: tx.transaction.message.accountKeys[0]?.pubkey?.toBase58() ?? "Unknown",
      amount: 0,
      merchantName,
      timestamp: ts,
      status: "failed",
    };
  }

  // Determine the merchant wallet index in the account keys
  const accountKeys = tx.transaction.message.accountKeys;
  const merchantIdx = accountKeys.findIndex(
    (k) => k.pubkey.toBase58() === merchantWallet
  );

  if (merchantIdx < 0) return null;

  // Calculate amount from balance change on the merchant wallet
  const preBalance = tx.meta.preBalances[merchantIdx] ?? 0;
  const postBalance = tx.meta.postBalances[merchantIdx] ?? 0;
  const balanceChange = postBalance - preBalance;

  // Only show inbound payments (positive balance change)
  if (balanceChange <= 0) return null;

  // The payer is always the first account (fee payer / signer)
  const customer = accountKeys[0]?.pubkey?.toBase58() ?? "Unknown";
  const ts = tx.blockTime ? new Date(tx.blockTime * 1000) : new Date();

  return {
    signature,
    customerAddress: customer,
    amount: lamportsToSOL(balanceChange),
    merchantName,
    timestamp: ts,
    status: "confirmed",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TransactionHistoryScreen() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const { merchants, fetchMerchants } = useMerchants();
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const myMerchants = useMemo(
    () => merchants.filter((m) => m.authority === publicKey),
    [merchants, publicKey]
  );

  // ----- Fetch on-chain transactions for all merchant PDAs -----

  const fetchTransactions = useCallback(async () => {
    if (!publicKey || myMerchants.length === 0) {
      setTransactions([]);
      return;
    }

    const connection = getConnection();
    const allTxns: MerchantTransaction[] = [];

    for (const merchant of myMerchants) {
      try {
        const merchantPda = new PublicKey(merchant.publicKey);

        // Get recent transaction signatures for this merchant PDA
        const signatures = await connection.getSignaturesForAddress(
          merchantPda,
          { limit: 50 }
        );

        if (signatures.length === 0) continue;

        // Batch fetch parsed transactions (3 at a time to avoid 429)
        const BATCH_SIZE = 3;
        for (let i = 0; i < signatures.length; i += BATCH_SIZE) {
          const batch = signatures.slice(i, i + BATCH_SIZE);
          const sigs = batch.map((s) => s.signature);

          try {
            const parsedTxns = await connection.getParsedTransactions(sigs, {
              maxSupportedTransactionVersion: 0,
            });

            for (let j = 0; j < parsedTxns.length; j++) {
              const parsed = parsedTxns[j];
              if (!parsed) continue;

              const result = parseMerchantPayment(
                parsed,
                sigs[j],
                merchant.authority,
                merchant.name
              );
              if (result) {
                allTxns.push(result);
              }
            }
          } catch (e: any) {
            console.warn("Failed to parse transaction batch:", e.message);
          }

          // Delay between batches to avoid rate limiting
          if (i + BATCH_SIZE < signatures.length) {
            await delay(300);
          }
        }
      } catch (e: any) {
        console.warn(
          `Failed to fetch signatures for merchant ${merchant.name}:`,
          e.message
        );
      }
    }

    // Sort by timestamp, newest first
    allTxns.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Deduplicate by signature (in case multiple merchant PDAs overlap)
    const seen = new Set<string>();
    const unique = allTxns.filter((tx) => {
      if (seen.has(tx.signature)) return false;
      seen.add(tx.signature);
      return true;
    });

    setTransactions(unique);
  }, [publicKey, myMerchants]);

  // Initial load
  useEffect(() => {
    if (merchants.length === 0) {
      fetchMerchants();
    }
  }, []);

  useEffect(() => {
    if (myMerchants.length > 0) {
      setLoading(true);
      fetchTransactions().finally(() => setLoading(false));
    }
  }, [myMerchants.length]);

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
        .filter((tx) => isToday(tx.timestamp) && tx.status === "confirmed")
        .reduce((sum, tx) => sum + tx.amount, 0),
    [transactions]
  );

  const weekEarnings = useMemo(
    () =>
      transactions
        .filter(
          (tx) => isWithinLastWeek(tx.timestamp) && tx.status === "confirmed"
        )
        .reduce((sum, tx) => sum + tx.amount, 0),
    [transactions]
  );

  const totalCount = transactions.length;

  // ----- Refresh -----

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchMerchants();
      await fetchTransactions();
    } finally {
      setRefreshing(false);
    }
  }, [fetchMerchants, fetchTransactions]);

  // ----- Open in Explorer -----

  const openExplorer = useCallback((signature: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(getTxUrl(signature));
  }, []);

  // ----- Transaction detail alert -----

  const showDetail = useCallback((tx: MerchantTransaction) => {
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
        `Customer: ${shortenAddress(tx.customerAddress, 6)}`,
        `Amount: ${formatSOL(tx.amount)} SOL`,
        `Merchant: ${tx.merchantName}`,
        `Date: ${dateStr}`,
        `Status: ${tx.status === "confirmed" ? "Confirmed" : "Failed"}`,
        `Signature: ${shortenAddress(tx.signature, 8)}`,
      ].join("\n"),
      [
        { text: "View on Explorer", onPress: () => openExplorer(tx.signature) },
        { text: "Close", style: "cancel" },
      ]
    );
  }, [openExplorer]);

  // ----- Filter tabs -----

  const FILTERS: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
  ];

  // ----- Render helpers -----

  const renderTransaction = ({ item }: { item: MerchantTransaction }) => {
    const isConfirmed = item.status === "confirmed";
    const amountColor = isConfirmed ? colors.success : colors.error;

    return (
      <TouchableOpacity
        style={styles.txRow}
        activeOpacity={0.7}
        onPress={() => showDetail(item)}
      >
        {/* Left icon */}
        <View style={[styles.txIcon, { backgroundColor: amountColor + "18" }]}>
          <Ionicons
            name={isConfirmed ? "checkmark-circle" : "close-circle"}
            size={22}
            color={amountColor}
          />
        </View>

        {/* Middle: customer + merchant */}
        <View style={styles.txInfo}>
          <Text style={styles.txCustomer} numberOfLines={1}>
            {shortenAddress(item.customerAddress)}
          </Text>
          <Text style={styles.txEvent} numberOfLines={1}>
            {item.merchantName}
          </Text>
        </View>

        {/* Right: amount + time + status */}
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, { color: amountColor }]}>
            +{formatSOL(item.amount)} SOL
          </Text>
          <View style={styles.txMeta}>
            <View
              style={[styles.statusDot, { backgroundColor: amountColor }]}
            />
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
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveFilter(f.key);
              }}
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

  if (loading && transactions.length === 0) {
    return (
      <View style={styles.container}>
        <AppHeader title="Transaction History" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </View>
    );
  }

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
        keyExtractor={(item) => item.signature}
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

  // Loading state
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
});
