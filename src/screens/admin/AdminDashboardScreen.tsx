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
import { typography } from "../../theme/typography";
import { spacing, borderRadius } from "../../theme/spacing";
import { useWallet } from "../../hooks/useWallet";
import { useEvents } from "../../hooks/useEvents";
import { useLoyalty } from "../../hooks/useLoyalty";
import { useMerchants } from "../../hooks/useMerchants";
import { shortenAddress, formatSOL } from "../../utils/formatters";

export function AdminDashboardScreen() {
  const router = useRouter();
  const { publicKey, balance, refreshBalance } = useWallet();
  const { events, fetchEvents, isLoading } = useEvents();
  const { badgeCollection, fetchBadgeCollection } = useLoyalty();
  const { seatTiers, fetchSeatTiers } = useMerchants();

  useEffect(() => {
    fetchEvents();
    fetchSeatTiers();
  }, []);

  const onRefresh = useCallback(async () => {
    await Promise.all([
      fetchEvents(),
      refreshBalance(),
      fetchBadgeCollection(),
      fetchSeatTiers(),
    ]);
  }, []);

  const myEvents = events.filter((e) => e.admin === publicKey);
  const totalTicketsSold = myEvents.reduce((sum, e) => sum + e.ticketsSold, 0);
  const activeEvents = myEvents.filter((e) => e.isActive && !e.isCancelled && !e.isMeetingEnded).length;

  const totalRevenue = myEvents.reduce((sum, event) => {
    const eventTiers = seatTiers.filter((t) => t.eventKey === event.publicKey);
    const tierRevenue = eventTiers.reduce(
      (s, t) => s + t.seatsSold * t.price,
      0
    );
    return sum + tierRevenue;
  }, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
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
            <Text style={styles.headerRole}>Admin</Text>
            <Text style={styles.headerSubtitle}>
              {publicKey ? shortenAddress(publicKey) : "Not connected"}
            </Text>
          </View>
        </View>
        <LinearGradient
          colors={["rgba(0,255,163,0.2)", "rgba(0,255,163,0.05)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.roleBadge}
        >
          <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
          <Text style={styles.roleBadgeText}>ADMIN</Text>
        </LinearGradient>
      </View>

      <LinearGradient
        colors={["rgba(0,255,163,0.15)", "rgba(0,206,201,0.05)"]}
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
            <Ionicons name="calendar" size={18} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{myEvents.length}</Text>
          <Text style={styles.statLabel}>My Events</Text>
        </View>
        <View style={styles.statCard}>
          <View
            style={[
              styles.statIconWrap,
              { backgroundColor: colors.secondaryMuted },
            ]}
          >
            <Ionicons name="ticket" size={18} color={colors.secondary} />
          </View>
          <Text style={styles.statValue}>{totalTicketsSold}</Text>
          <Text style={styles.statLabel}>Tickets Sold</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View
            style={[
              styles.statIconWrap,
              { backgroundColor: colors.accentMuted },
            ]}
          >
            <Ionicons name="flash" size={18} color={colors.accent} />
          </View>
          <Text style={styles.statValue}>{activeEvents}</Text>
          <Text style={styles.statLabel}>Active Events</Text>
        </View>
        <View style={styles.statCard}>
          <View
            style={[
              styles.statIconWrap,
              { backgroundColor: colors.warningLight },
            ]}
          >
            <Ionicons name="cash" size={18} color={colors.warning} />
          </View>
          <Text style={styles.statValue}>{formatSOL(totalRevenue)}</Text>
          <Text style={styles.statLabel}>Revenue (SOL)</Text>
        </View>
      </View>

      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(admin)/create-event")}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={colors.gradientPrimary as unknown as [string, string]}
              style={styles.actionIconWrap}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add" size={22} color={colors.background} />
            </LinearGradient>
            <Text style={styles.actionLabel}>Create Event</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(admin)/events")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.actionIconWrap,
                { backgroundColor: colors.secondaryMuted },
              ]}
            >
              <Ionicons name="list" size={22} color={colors.secondary} />
            </View>
            <Text style={styles.actionLabel}>My Events</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(admin)/check-in")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.actionIconWrap,
                { backgroundColor: colors.accentMuted },
              ]}
            >
              <Ionicons
                name="qr-code"
                size={22}
                color={colors.accent}
              />
            </View>
            <Text style={styles.actionLabel}>Check In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/(admin)/setup-badges")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.actionIconWrap,
                { backgroundColor: colors.tierGoldLight },
              ]}
            >
              <Ionicons name="ribbon" size={22} color={colors.tierGold} />
            </View>
            <Text style={styles.actionLabel}>Badges</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.badgeSection}>
        <View style={styles.badgeCard}>
          <View style={styles.badgeCardHeader}>
            <View style={styles.badgeCardLeft}>
              <Ionicons name="ribbon-outline" size={20} color={colors.text} />
              <Text style={styles.badgeCardTitle}>Badge Collection</Text>
            </View>
            <View
              style={[
                styles.badgeStatusPill,
                badgeCollection ? styles.badgeActive : styles.badgeInactive,
              ]}
            >
              <View
                style={[
                  styles.badgeStatusDot,
                  {
                    backgroundColor: badgeCollection
                      ? colors.primary
                      : colors.textMuted,
                  },
                ]}
              />
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
          <Text style={styles.badgeCardDesc}>
            {badgeCollection
              ? "Your badge collection is active. Attendees earn loyalty badges at check-in."
              : "Set up a badge collection to enable loyalty rewards for your events."}
          </Text>
          <TouchableOpacity
            style={[
              styles.badgeAction,
              badgeCollection && styles.badgeActionActive,
            ]}
            onPress={() => router.push("/(admin)/setup-badges")}
            activeOpacity={0.7}
          >
            <Ionicons
              name={badgeCollection ? "eye-outline" : "add-circle-outline"}
              size={16}
              color={badgeCollection ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.badgeActionText,
                badgeCollection && styles.badgeActionTextActive,
              ]}
            >
              {badgeCollection ? "View Collection" : "Setup Badges"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {myEvents.length > 0 && (
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Events</Text>
            <TouchableOpacity
              onPress={() => router.push("/(admin)/events")}
              activeOpacity={0.6}
            >
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {myEvents.slice(0, 3).map((event) => {
            const eventTiers = seatTiers.filter(
              (t) => t.eventKey === event.publicKey
            );
            const totalCapacity = eventTiers.reduce(
              (s, t) => s + t.totalSeats,
              0
            );
            const totalSold = eventTiers.reduce(
              (s, t) => s + t.seatsSold,
              0
            );
            const fillRate =
              totalCapacity > 0
                ? Math.round((totalSold / totalCapacity) * 100)
                : 0;

            return (
              <TouchableOpacity
                key={event.publicKey}
                style={styles.recentEventCard}
                onPress={() =>
                  router.push({
                    pathname: "/(admin)/event-details",
                    params: { eventKey: event.publicKey },
                  })
                }
                activeOpacity={0.7}
              >
                <View style={styles.recentEventLeft}>
                  <Text style={styles.recentEventName} numberOfLines={1}>
                    {event.name}
                  </Text>
                  <View style={styles.recentEventMeta}>
                    <Ionicons
                      name="location-outline"
                      size={12}
                      color={colors.textMuted}
                    />
                    <Text style={styles.recentEventMetaText} numberOfLines={1}>
                      {event.venue}
                    </Text>
                  </View>
                </View>
                <View style={styles.recentEventRight}>
                  <View style={styles.fillRateBadge}>
                    <Text style={styles.fillRateText}>{fillRate}%</Text>
                  </View>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: event.isActive ? colors.primary : colors.textMuted },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
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
    color: colors.primary,
    letterSpacing: 1.2,
  },

  walletCard: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
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
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
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

  actionsSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  actionCard: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
    textAlign: "center",
  },

  badgeSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  badgeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  badgeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  badgeCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  badgeCardTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },
  badgeCardDesc: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  badgeStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeActive: {
    backgroundColor: colors.primaryMuted,
  },
  badgeInactive: {
    backgroundColor: colors.surfaceLight,
  },
  badgeStatusText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },
  badgeActiveText: {
    color: colors.primary,
  },
  badgeInactiveText: {
    color: colors.textMuted,
  },
  badgeAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
  },
  badgeActionActive: {
    backgroundColor: colors.primaryMuted,
  },
  badgeActionText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
  },
  badgeActionTextActive: {
    color: colors.primary,
  },

  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.accent,
  },

  recentSection: {
    paddingHorizontal: spacing.lg,
  },
  recentEventCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  recentEventLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  recentEventName: {
    fontSize: 15,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    marginBottom: 4,
  },
  recentEventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  recentEventMetaText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
    flex: 1,
  },
  recentEventRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  fillRateBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  fillRateText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
