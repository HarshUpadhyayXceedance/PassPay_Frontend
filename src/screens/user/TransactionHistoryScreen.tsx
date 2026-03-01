import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PublicKey } from "@solana/web3.js";
import { useTickets } from "../../hooks/useTickets";
import { useWallet } from "../../hooks/useWallet";
import { useMerchants } from "../../hooks/useMerchants";
import { TicketDisplay } from "../../types/ticket";
import { formatSOL, formatDate, shortenAddress, lamportsToSOL } from "../../utils/formatters";
import { getTokenUrl, getTxUrl } from "../../solana/utils/explorer";
import { getConnection } from "../../solana/config/connection";
import { PROGRAM_ID } from "../../solana/config/constants";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing, borderRadius } from "../../theme/spacing";

type FilterTab = "all" | "purchases" | "checked-in" | "payments";

interface TransactionItem {
  id: string;
  type: "purchase" | "check-in" | "payment";
  eventName: string;
  eventVenue: string;
  date: Date;
  seatNumber: number;
  mint: string;
  // payment-specific
  amount?: number;
  merchantName?: string;
  signature?: string;
}

export function TransactionHistoryScreen() {
  const router = useRouter();
  const { tickets, fetchMyTickets, isLoading } = useTickets();
  const { balance, publicKey } = useWallet();
  const { merchants } = useMerchants();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [payments, setPayments] = useState<TransactionItem[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    fetchMyTickets();
  }, []);

  useEffect(() => {
    if (publicKey) fetchPaymentHistory();
  }, [publicKey]);

  const fetchPaymentHistory = useCallback(async () => {
    if (!publicKey) return;
    setLoadingPayments(true);
    try {
      const connection = getConnection();
      const walletPubkey = new PublicKey(publicKey);

      // Fetch recent signatures for the user's wallet
      const sigs = await connection.getSignaturesForAddress(walletPubkey, {
        limit: 50,
      });

      // Batch fetch parsed transactions (3 at a time to avoid 429)
      const paymentItems: TransactionItem[] = [];
      const chunks: typeof sigs[] = [];
      for (let i = 0; i < sigs.length; i += 3) {
        chunks.push(sigs.slice(i, i + 3));
      }

      for (const chunk of chunks) {
        const txs = await connection.getParsedTransactions(
          chunk.map((s) => s.signature),
          { maxSupportedTransactionVersion: 0 }
        );

        for (let j = 0; j < txs.length; j++) {
          const tx = txs[j];
          if (!tx || tx.meta?.err) continue;

          // Check if this transaction interacts with our program
          const programInvoked = tx.transaction.message.accountKeys.some(
            (key) => key.pubkey.equals(PROGRAM_ID)
          );
          if (!programInvoked) continue;

          // Check if user's balance decreased (they paid something)
          const walletIndex = tx.transaction.message.accountKeys.findIndex(
            (key) => key.pubkey.equals(walletPubkey)
          );
          if (walletIndex === -1) continue;

          const preBal = tx.meta?.preBalances[walletIndex] ?? 0;
          const postBal = tx.meta?.postBalances[walletIndex] ?? 0;
          const diff = preBal - postBal;

          // Filter: only SOL outflows > 0.001 SOL (skip tiny fees / ticket buys handled separately)
          // Merchant payments are typically > rent-exempt min but less than ticket purchases
          if (diff <= 1_000_000) continue;

          // Check if any merchant PDA received funds
          const merchantMatch = merchants.find((m) =>
            tx.transaction.message.accountKeys.some(
              (key) => key.pubkey.toBase58() === m.authority
            )
          );

          // If no merchant matched, skip (could be a ticket purchase)
          if (!merchantMatch) continue;

          paymentItems.push({
            id: `payment-${chunk[j].signature}`,
            type: "payment",
            eventName: "",
            eventVenue: "",
            date: new Date((chunk[j].blockTime ?? 0) * 1000),
            seatNumber: 0,
            mint: "",
            amount: diff,
            merchantName: merchantMatch.name,
            signature: chunk[j].signature,
          });
        }

        // Rate limit between chunks
        if (chunks.indexOf(chunk) < chunks.length - 1) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      setPayments(paymentItems);
    } catch (error) {
      console.error("Failed to fetch payment history:", error);
    } finally {
      setLoadingPayments(false);
    }
  }, [publicKey, merchants]);

  const transactions: TransactionItem[] = useMemo(() => {
    const items: TransactionItem[] = [];

    tickets.forEach((ticket: TicketDisplay) => {
      // Purchase transaction
      items.push({
        id: `purchase-${ticket.publicKey}`,
        type: "purchase",
        eventName: ticket.eventName || "Unknown Event",
        eventVenue: ticket.eventVenue || "",
        date: ticket.eventDate,
        seatNumber: ticket.seatNumber,
        mint: ticket.mint,
      });

      // Check-in transaction
      if (ticket.isCheckedIn && ticket.checkedInAt) {
        items.push({
          id: `checkin-${ticket.publicKey}`,
          type: "check-in",
          eventName: ticket.eventName || "Unknown Event",
          eventVenue: ticket.eventVenue || "",
          date: ticket.checkedInAt,
          seatNumber: ticket.seatNumber,
          mint: ticket.mint,
        });
      }
    });

    // Add merchant payments
    items.push(...payments);

    // Sort by date, newest first
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    return items;
  }, [tickets, payments]);

  const filtered = useMemo(() => {
    switch (activeFilter) {
      case "purchases":
        return transactions.filter((t) => t.type === "purchase");
      case "checked-in":
        return transactions.filter((t) => t.type === "check-in");
      case "payments":
        return transactions.filter((t) => t.type === "payment");
      default:
        return transactions;
    }
  }, [transactions, activeFilter]);

  const stats = useMemo(() => ({
    totalTickets: tickets.length,
    checkedIn: tickets.filter((t) => t.isCheckedIn).length,
    upcoming: tickets.filter((t) => !t.isCheckedIn && t.eventDate > new Date()).length,
    paymentsCount: payments.length,
  }), [tickets, payments]);

  const openExplorer = useCallback((item: TransactionItem) => {
    if (item.signature) {
      Linking.openURL(getTxUrl(item.signature));
    } else if (item.mint) {
      Linking.openURL(getTokenUrl(item.mint));
    }
  }, []);

  const onRefresh = useCallback(async () => {
    await Promise.all([fetchMyTickets(), fetchPaymentHistory()]);
  }, [fetchMyTickets, fetchPaymentHistory]);

  const FILTERS: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "purchases", label: "Tickets" },
    { key: "payments", label: "Payments" },
    { key: "checked-in", label: "Check-ins" },
  ];

  const renderTransaction = ({ item }: { item: TransactionItem }) => {
    const isPayment = item.type === "payment";
    const isPurchase = item.type === "purchase";
    const iconName = isPayment
      ? "storefront"
      : isPurchase
        ? "ticket"
        : "checkmark-circle";
    const iconColor = isPayment
      ? colors.secondary
      : isPurchase
        ? colors.primary
        : colors.success;

    return (
      <TouchableOpacity
        style={styles.txRow}
        activeOpacity={0.7}
        onPress={() => openExplorer(item)}
        accessibilityRole="button"
        accessibilityLabel={
          isPayment
            ? `Payment to ${item.merchantName}, ${lamportsToSOL(item.amount ?? 0).toFixed(4)} SOL`
            : `${item.type === "purchase" ? "Ticket purchase" : "Check-in"} for ${item.eventName}`
        }
      >
        <View style={[styles.txIcon, { backgroundColor: iconColor + "18" }]}>
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>

        <View style={styles.txInfo}>
          <Text style={styles.txTitle} numberOfLines={1}>
            {isPayment
              ? "Merchant Payment"
              : isPurchase
                ? "Ticket Purchase"
                : "Event Check-in"}
          </Text>
          <Text style={styles.txEvent} numberOfLines={1}>
            {isPayment ? item.merchantName : item.eventName}
          </Text>
          {!isPayment && item.eventVenue ? (
            <Text style={styles.txVenue} numberOfLines={1}>
              {item.eventVenue}
            </Text>
          ) : null}
        </View>

        <View style={styles.txRight}>
          {isPayment ? (
            <Text style={styles.txAmount}>
              -{lamportsToSOL(item.amount ?? 0).toFixed(4)} SOL
            </Text>
          ) : (
            <Text style={styles.txSeat}>Seat #{item.seatNumber}</Text>
          )}
          <Text style={styles.txDate}>{formatDate(item.date)}</Text>
          {!isPayment && item.mint ? (
            <Text style={styles.txMint}>{shortenAddress(item.mint, 4)}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Stats Card */}
      <LinearGradient
        colors={[colors.primary + "20", colors.secondary + "15"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsCard}
      >
        <View style={styles.statsAccent} />
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalTickets}</Text>
            <Text style={styles.statLabel}>Tickets</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.checkedIn}</Text>
            <Text style={styles.statLabel}>Attended</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.paymentsCount}</Text>
            <Text style={styles.statLabel}>Payments</Text>
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
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Filter by ${f.label}`}
            >
              <Text
                style={[styles.filterLabel, isActive && styles.filterLabelActive]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Transactions</Text>
            <Text style={styles.emptyMessage}>
              {activeFilter === "purchases"
                ? "No ticket purchases yet. Browse events to get started."
                : activeFilter === "checked-in"
                  ? "No check-ins yet. Show your QR code at event entry."
                  : activeFilter === "payments"
                    ? "No merchant payments yet. Pay at event vendors with your wallet."
                    : "Your transaction history will appear here."}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading || loadingPayments}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  headerSpacer: { width: 36 },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },

  // Stats card
  statsCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + "30",
    overflow: "hidden",
  },
  statsAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
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
  txTitle: {
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
  txVenue: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: colors.textMuted,
    marginTop: 1,
  },
  txRight: {
    alignItems: "flex-end",
  },
  txSeat: {
    fontSize: 13,
    fontFamily: fonts.heading,
    color: colors.primary,
    marginBottom: 2,
  },
  txAmount: {
    fontSize: 13,
    fontFamily: fonts.heading,
    color: colors.secondary,
    marginBottom: 2,
  },
  txDate: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  txMint: {
    fontSize: 10,
    fontFamily: fonts.body,
    color: colors.textMuted,
    marginTop: 1,
  },

  // Separator
  separator: {
    height: spacing.sm,
  },

  // Empty state
  emptyContainer: {
    alignItems: "center",
    paddingTop: spacing.xxl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
