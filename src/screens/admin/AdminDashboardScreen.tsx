import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { AppCard } from "../../components/ui/AppCard";
import { AppButton } from "../../components/ui/AppButton";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { useWallet } from "../../hooks/useWallet";
import { useEvents } from "../../hooks/useEvents";
import { useLoyalty } from "../../hooks/useLoyalty";
import { shortenAddress, formatSOL } from "../../utils/formatters";

export function AdminDashboardScreen() {
  const router = useRouter();
  const { publicKey, balance, refreshBalance } = useWallet();
  const { events, fetchEvents, isLoading } = useEvents();
  const { badgeCollection, fetchBadgeCollection } = useLoyalty();

  useEffect(() => {
    fetchEvents();
  }, []);

  const onRefresh = async () => {
    await Promise.all([fetchEvents(), refreshBalance(), fetchBadgeCollection()]);
  };

  const myEvents = events.filter(
    (e) => e.admin === publicKey
  );
  const totalTicketsSold = myEvents.reduce(
    (sum, e) => sum + e.ticketsSold,
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
        <Text style={styles.walletLabel}>Admin Wallet</Text>
        <Text style={styles.balance}>{formatSOL(balance)} SOL</Text>
        {publicKey && (
          <Text style={styles.address}>{shortenAddress(publicKey, 6)}</Text>
        )}
      </View>

      <View style={styles.statsRow}>
        <AppCard style={styles.statCard}>
          <Text style={styles.statValue}>{myEvents.length}</Text>
          <Text style={styles.statLabel}>My Events</Text>
        </AppCard>
        <AppCard style={styles.statCard}>
          <Text style={styles.statValue}>{totalTicketsSold}</Text>
          <Text style={styles.statLabel}>Tickets Sold</Text>
        </AppCard>
      </View>

      <AppButton
        title="Create New Event"
        onPress={() => router.push("/(admin)/create-event")}
        size="lg"
      />

      <View style={styles.badgeSection}>
        <View style={styles.badgeStatusRow}>
          <Text style={styles.badgeLabel}>Badge Collection</Text>
          <View
            style={[
              styles.badgeStatusPill,
              badgeCollection ? styles.badgeActive : styles.badgeInactive,
            ]}
          >
            <Text
              style={[
                styles.badgeStatusText,
                badgeCollection
                  ? styles.badgeActiveText
                  : styles.badgeInactiveText,
              ]}
            >
              {badgeCollection ? "Active" : "Not Set Up"}
            </Text>
          </View>
        </View>
        <AppButton
          title={badgeCollection ? "View Badge Collection" : "Setup Badges"}
          onPress={() => router.push("/(admin)/setup-badges")}
          variant="outline"
          size="md"
        />
      </View>
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
    backgroundColor: colors.primary + "15",
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + "30",
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
  },
  badgeSection: {
    marginTop: spacing.lg,
  },
  badgeStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  badgeLabel: {
    ...typography.body,
    color: colors.text,
  },
  badgeStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeActive: {
    backgroundColor: colors.primary + "20",
  },
  badgeInactive: {
    backgroundColor: colors.textMuted + "20",
  },
  badgeStatusText: {
    fontSize: 12,
  },
  badgeActiveText: {
    color: colors.primary,
  },
  badgeInactiveText: {
    color: colors.textMuted,
  },
});
