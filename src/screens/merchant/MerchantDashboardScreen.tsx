import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { AppCard } from "../../components/ui/AppCard";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { useWallet } from "../../hooks/useWallet";
import { useMerchants } from "../../hooks/useMerchants";
import { shortenAddress, formatSOL } from "../../utils/formatters";

export function MerchantDashboardScreen() {
  const { publicKey, balance, refreshBalance } = useWallet();
  const { merchants, fetchMerchants, isLoading } = useMerchants();

  useEffect(() => {
    fetchMerchants();
  }, []);

  const onRefresh = async () => {
    await Promise.all([fetchMerchants(), refreshBalance()]);
  };

  const myMerchants = merchants.filter(
    (m) => m.authority === publicKey
  );
  const totalReceived = myMerchants.reduce(
    (sum, m) => sum + m.totalReceived,
    0
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.walletCard}>
        <Text style={styles.walletLabel}>Merchant Wallet</Text>
        <Text style={styles.balance}>{formatSOL(balance)} SOL</Text>
        {publicKey && (
          <Text style={styles.address}>{shortenAddress(publicKey, 6)}</Text>
        )}
      </View>

      <View style={styles.statsRow}>
        <AppCard style={styles.statCard}>
          <Text style={styles.statValue}>{formatSOL(totalReceived)}</Text>
          <Text style={styles.statLabel}>Total Received (SOL)</Text>
        </AppCard>
        <AppCard style={styles.statCard}>
          <Text style={styles.statValue}>{myMerchants.length}</Text>
          <Text style={styles.statLabel}>Registered At</Text>
        </AppCard>
      </View>

      {myMerchants.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Not Registered</Text>
          <Text style={styles.emptyText}>
            Ask an event organizer to register you as a merchant
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  walletCard: {
    backgroundColor: colors.secondary + "15",
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.secondary + "30",
  },
  walletLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  balance: {
    ...typography.h1,
    color: colors.text,
    marginVertical: spacing.xs,
  },
  address: {
    ...typography.small,
    color: colors.textMuted,
    fontFamily: "monospace",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    ...typography.h2,
    color: colors.secondary,
  },
  statLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
});
