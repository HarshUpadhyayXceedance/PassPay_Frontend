import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PublicKey, ParsedTransactionWithMeta } from "@solana/web3.js";
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
import { confirm } from "../../components/ui/ConfirmDialogProvider";

type FilterTab = "all" | "today" | "week";

interface MerchantTransaction {
  signature: string;
  customerAddress: string;
  amount: number;
  merchantName: string;
  timestamp: Date;
  status: "confirmed" | "failed";
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

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseMerchantPayment(
  tx: ParsedTransactionWithMeta,
  signature: string,
  merchantAddresses: string[],
  merchantName: string
): MerchantTransaction | null {
  if (!tx || !tx.meta) return null;


  if (tx.meta.err) {
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

  const knownSet = new Set(merchantAddresses);
  let totalInbound = 0;






  if (tx.meta.innerInstructions) {
    for (const inner of tx.meta.innerInstructions) {
      for (const ix of inner.instructions) {
        if (
          "parsed" in ix &&
          ix.parsed?.type === "transfer" &&
          ix.parsed?.info
        ) {
          const dest: string | undefined = ix.parsed.info.destination;
          const lamports: number | undefined = ix.parsed.info.lamports;
          if (dest && knownSet.has(dest) && lamports && lamports > 0) {
            totalInbound += lamports;
          }
        }
      }
    }
  }


  if (totalInbound === 0) {
    const accountKeys = tx.transaction.message.accountKeys;
    for (let idx = 0; idx < accountKeys.length; idx++) {
      const pubkey = accountKeys[idx]?.pubkey?.toBase58();
      if (!pubkey || !knownSet.has(pubkey)) continue;
      const change =
        (tx.meta.postBalances[idx] ?? 0) - (tx.meta.preBalances[idx] ?? 0);
      if (change > 0) totalInbound += change;
    }
  }


  if (totalInbound <= 100_000) return null;

  const customer =
    tx.transaction.message.accountKeys[0]?.pubkey?.toBase58() ?? "Unknown";
  const ts = tx.blockTime ? new Date(tx.blockTime * 1000) : new Date();

  return {
    signature,
    customerAddress: customer,
    amount: lamportsToSOL(totalInbound),
    merchantName,
    timestamp: ts,
    status: "confirmed",
  };
}

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













  const fetchTransactions = useCallback(async () => {
    if (!publicKey || myMerchants.length === 0) {
      setTransactions([]);
      return;
    }

    console.log(`[TxHistory] Fetching for ${myMerchants.length} merchant(s), wallet=${publicKey.slice(0, 8)}`);
    const connection = getConnection();
    const allTxns: MerchantTransaction[] = [];
    const seenSigs = new Set<string>();

    for (let mi = 0; mi < myMerchants.length; mi++) {
      const merchant = myMerchants[mi];
      const knownAddresses = [merchant.authority, merchant.publicKey];

      try {

        const signatures = await connection.getSignaturesForAddress(
          new PublicKey(merchant.publicKey),
          { limit: 10 }
        );

        if (signatures.length === 0) {
          console.log(`[TxHistory] ${merchant.name}: 0 signatures`);
          continue;
        }
        console.log(`[TxHistory] ${merchant.name}: ${signatures.length} signatures found`);


        await delay(200);


        const sigs = signatures.map((s) => s.signature);
        let parsedTxns: (ParsedTransactionWithMeta | null)[] = [];
        try {
          parsedTxns = await connection.getParsedTransactions(sigs, {
            maxSupportedTransactionVersion: 0,
          });
        } catch (e: any) {

          console.warn(`[TxHistory] Batch failed for ${merchant.name}, chunking:`, e.message);
          await delay(600);
          const CHUNK = 5;
          for (let i = 0; i < sigs.length; i += CHUNK) {
            try {
              const chunk = await connection.getParsedTransactions(
                sigs.slice(i, i + CHUNK),
                { maxSupportedTransactionVersion: 0 }
              );
              parsedTxns.push(...chunk);
            } catch {
              parsedTxns.push(
                ...new Array(Math.min(CHUNK, sigs.length - i)).fill(null)
              );
            }
            if (i + CHUNK < sigs.length) await delay(300);
          }
        }


        let found = 0;
        for (let j = 0; j < parsedTxns.length; j++) {
          const parsed = parsedTxns[j];
          if (!parsed || seenSigs.has(sigs[j])) continue;

          const result = parseMerchantPayment(
            parsed,
            sigs[j],
            knownAddresses,
            merchant.name
          );
          if (result) {
            seenSigs.add(sigs[j]);
            allTxns.push(result);
            found++;
          }
        }

        console.log(
          `[TxHistory] ${merchant.name}: ${parsedTxns.filter(Boolean).length} parsed, ${found} payments`
        );
      } catch (e: any) {
        console.warn(`[TxHistory] Failed for ${merchant.name}:`, e.message);
      }


      if (mi < myMerchants.length - 1) await delay(300);
    }

    allTxns.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    console.log(`[TxHistory] Total: ${allTxns.length} payment(s) found`);
    setTransactions(allTxns);
  }, [publicKey, myMerchants]);


  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        if (merchants.length === 0) {
          await fetchMerchants();
        }
      } catch (e) {
        console.warn("Failed to fetch merchants:", e);
      }





      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (myMerchants.length > 0) {
      setLoading(true);
      fetchTransactions().finally(() => setLoading(false));
    } else if (merchants.length > 0) {

      setLoading(false);
    }
  }, [myMerchants.length, merchants.length, fetchTransactions]);



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


  const onChainTotal = useMemo(
    () => myMerchants.reduce((sum, m) => sum + m.totalReceived, 0),
    [myMerchants]
  );



  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchMerchants();
      await fetchTransactions();
    } finally {
      setRefreshing(false);
    }
  }, [fetchMerchants, fetchTransactions]);



  const openExplorer = useCallback((signature: string) => {
    Linking.openURL(getTxUrl(signature));
  }, []);



  const showDetail = useCallback((tx: MerchantTransaction) => {
    const dateStr = tx.timestamp.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    confirm({
      title: "Transaction Details",
      message: [
        `Customer: ${shortenAddress(tx.customerAddress, 6)}`,
        `Amount: ${formatSOL(tx.amount)} SOL`,
        `Merchant: ${tx.merchantName}`,
        `Date: ${dateStr}`,
        `Status: ${tx.status === "confirmed" ? "Confirmed" : "Failed"}`,
        `Signature: ${shortenAddress(tx.signature, 8)}`,
      ].join("\n"),
      type: "info",
      buttons: [
        { text: "View on Explorer", style: "default", onPress: () => openExplorer(tx.signature) },
        { text: "Close", style: "cancel", onPress: () => {} },
      ],
    });
  }, [openExplorer]);



  const FILTERS: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
  ];



  const renderTransaction = ({ item }: { item: MerchantTransaction }) => {
    const isConfirmed = item.status === "confirmed";
    const amountColor = isConfirmed ? colors.success : colors.error;

    return (
      <TouchableOpacity
        style={styles.txRow}
        activeOpacity={0.7}
        onPress={() => showDetail(item)}
      >

        <View style={[styles.txIcon, { backgroundColor: amountColor + "18" }]}>
          <Ionicons
            name={isConfirmed ? "checkmark-circle" : "close-circle"}
            size={22}
            color={amountColor}
          />
        </View>


        <View style={styles.txInfo}>
          <Text style={styles.txCustomer} numberOfLines={1}>
            {shortenAddress(item.customerAddress)}
          </Text>
          <Text style={styles.txEvent} numberOfLines={1}>
            {item.merchantName}
          </Text>
        </View>


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
            <Text style={styles.summaryLabel}>All-Time</Text>
            <Text style={styles.summaryValue}>
              {onChainTotal > 0
                ? `${formatSOL(onChainTotal)} SOL`
                : "0"}
            </Text>
          </View>
        </View>
      </LinearGradient>


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


  separator: {
    height: spacing.sm,
  },


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
