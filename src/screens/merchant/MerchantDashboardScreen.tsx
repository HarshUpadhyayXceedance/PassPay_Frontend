import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing, borderRadius } from "../../theme/spacing";
import { useWallet } from "../../hooks/useWallet";
import { useEvents } from "../../hooks/useEvents";
import { useMerchants } from "../../hooks/useMerchants";
import { MerchantDisplay } from "../../types/merchant";
import { shortenAddress, formatSOL } from "../../utils/formatters";

export function MerchantDashboardScreen() {
  const router = useRouter();
  const { publicKey, balance, refreshBalance } = useWallet();
  const { events, fetchEvents } = useEvents();
  const { merchants, products, fetchMerchants, fetchProducts, isLoading } =
    useMerchants();

  useEffect(() => {
    fetchMerchants();
    fetchEvents();
  }, []);


  useEffect(() => {
    const mine = merchants.filter((m) => m.authority === publicKey);
    mine.forEach((m) => fetchProducts(m.publicKey));
  }, [merchants.length, publicKey]);

  const onRefresh = useCallback(async () => {
    await Promise.all([fetchMerchants(), fetchEvents(), refreshBalance()]);
  }, []);

  const myMerchants = merchants.filter((m) => m.authority === publicKey);
  const totalReceived = myMerchants.reduce(
    (sum, m) => sum + m.totalReceived,
    0
  );

  const renderMerchantEvent = (item: MerchantDisplay) => {
    const event = events.find((e) => e.publicKey === item.eventKey);
    const merchantProducts = products.filter(
      (p) => p.merchantKey === item.publicKey
    );
    const eventDate = event?.eventDate
      ? new Date(event.eventDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";

    return (
      <View key={item.publicKey} style={styles.eventCard}>
        <View style={styles.eventCardHeader}>
          <View style={styles.eventCardInfo}>
            <Text style={styles.eventCardName} numberOfLines={1}>
              {event?.name ?? "Unknown Event"}
            </Text>
            {event?.venue ? (
              <View style={styles.eventMeta}>
                <Ionicons
                  name="location-outline"
                  size={12}
                  color={colors.textMuted}
                />
                <Text style={styles.eventMetaText} numberOfLines={1}>
                  {event.venue}
                </Text>
              </View>
            ) : null}
            {eventDate ? (
              <View style={styles.eventMeta}>
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={colors.textMuted}
                />
                <Text style={styles.eventMetaText}>{eventDate}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.eventStats}>
            <View style={styles.eventStatBadge}>
              <Ionicons name="cube-outline" size={12} color={colors.primary} />
              <Text style={styles.eventStatText}>
                {merchantProducts.length}
              </Text>
            </View>
            <View style={styles.eventStatBadge}>
              <Ionicons
                name="cash-outline"
                size={12}
                color={colors.secondary}
              />
              <Text style={styles.eventStatText}>
                {formatSOL(item.totalReceived)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.eventCardActions}>
          <TouchableOpacity
            style={styles.eventAction}
            onPress={() =>
              router.push({
                pathname: "/(merchant)/manage-products",
                params: {
                  eventKey: item.eventKey,
                  merchantKey: item.publicKey,
                },
              })
            }
            activeOpacity={0.7}
          >
            <Ionicons name="cube" size={16} color={colors.secondary} />
            <Text style={styles.eventActionText}>Products</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.eventAction}
            onPress={() =>
              router.push({
                pathname: "/(merchant)/generate-qr",
                params: {
                  eventKey: item.eventKey,
                  merchantKey: item.publicKey,
                },
              })
            }
            activeOpacity={0.7}
          >
            <Ionicons name="qr-code" size={16} color={colors.primary} />
            <Text style={styles.eventActionText}>Generate QR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.eventAction}
            onPress={() =>
              router.push({
                pathname: "/(merchant)/add-product",
                params: {
                  eventKey: item.eventKey,
                  merchantKey: item.publicKey,
                },
              })
            }
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={16} color={colors.success} />
            <Text style={styles.eventActionText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.eventAction}
            onPress={() => router.push("/(merchant)/verify-purchase")}
            activeOpacity={0.7}
          >
            <Ionicons name="scan" size={16} color={colors.accent} />
            <Text style={styles.eventActionText}>Verify</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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


      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View
            style={[
              styles.statIconWrap,
              { backgroundColor: colors.primaryMuted },
            ]}
          >
            <Ionicons name="cash" size={18} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{formatSOL(totalReceived)}</Text>
          <Text style={styles.statLabel}>Total Received (SOL)</Text>
        </View>
        <View style={styles.statCard}>
          <View
            style={[
              styles.statIconWrap,
              { backgroundColor: colors.secondaryMuted },
            ]}
          >
            <Ionicons name="calendar" size={18} color={colors.secondary} />
          </View>
          <Text style={styles.statValue}>{myMerchants.length}</Text>
          <Text style={styles.statLabel}>Events</Text>
        </View>
      </View>


      {myMerchants.length > 0 && (
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>
            Your Events ({myMerchants.length})
          </Text>
          <Text style={styles.sectionSubtitle}>
            Manage products and generate QR codes per event
          </Text>
          {myMerchants.map((m) => renderMerchantEvent(m))}
        </View>
      )}


      {myMerchants.length === 0 && !isLoading && (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons
              name="storefront-outline"
              size={48}
              color={colors.textMuted}
            />
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
  eventsSection: {
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  eventCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  eventCardInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  eventCardName: {
    fontSize: 16,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  eventMetaText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
    flex: 1,
  },
  eventStats: {
    gap: 4,
  },
  eventStatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  eventStatText: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
  },
  eventCardActions: {
    flexDirection: "row",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  eventAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
  },
  eventActionText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
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
