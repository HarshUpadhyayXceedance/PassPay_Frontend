import React, { useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require("../../../assets/icon.png")}
            style={styles.headerLogo}
          />
          <View>
            <Text style={styles.headerRole}>Merchant</Text>
            <Text style={styles.headerSubtitle}>
              {publicKey ? shortenAddress(publicKey) : "Not connected"}
            </Text>
          </View>
        </View>
        <LinearGradient
          colors={["rgba(108,92,231,0.2)", "rgba(108,92,231,0.05)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.roleBadge}
        >
          <Ionicons name="storefront" size={14} color={colors.secondary} />
          <Text style={styles.roleBadgeText}>MERCHANT</Text>
        </LinearGradient>
      </View>

      {/* Wallet Balance Card */}
      <LinearGradient
        colors={["rgba(108,92,231,0.15)", "rgba(108,92,231,0.03)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.walletCard}
      >
        <Text style={styles.walletLabel}>Wallet Balance</Text>
        <Text style={styles.balance}>{formatSOL(balance)} SOL</Text>
        {publicKey && (
          <Text style={styles.address}>{shortenAddress(publicKey, 6)}</Text>
        )}
      </LinearGradient>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="cash" size={18} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{formatSOL(totalReceived)}</Text>
          <Text style={styles.statLabel}>Total Received (SOL)</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.secondaryMuted }]}>
            <Ionicons name="calendar" size={18} color={colors.secondary} />
          </View>
          <Text style={styles.statValue}>{myMerchants.length}</Text>
          <Text style={styles.statLabel}>Registered At</Text>
        </View>
      </View>

      {/* Empty State */}
      {myMerchants.length === 0 && (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="storefront-outline" size={48} color={colors.textMuted} />
          </View>
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
    paddingTop: 56,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  headerRole: {
    fontSize: 22,
    fontFamily: fonts.displayBold,
    color: colors.text,
    marginBottom: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    color: colors.secondary,
    letterSpacing: 1.2,
  },
  walletCard: {
    marginHorizontal: spacing.lg,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  walletLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  balance: {
    fontSize: 32,
    fontFamily: fonts.heading,
    color: colors.text,
    marginVertical: spacing.xs,
  },
  address: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
});
