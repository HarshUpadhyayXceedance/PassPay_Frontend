import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { TierBadge } from "../../components/loyalty/TierBadge";
import { TierProgressBar } from "../../components/loyalty/TierProgressBar";
import { StreakDisplay } from "../../components/loyalty/StreakDisplay";
import { StreakCalendar } from "../../components/loyalty/StreakCalendar";
import {
  AchievementCard,
  getAchievements,
} from "../../components/loyalty/AchievementCard";
import { AppCard } from "../../components/ui/AppCard";
import { useLoyalty } from "../../hooks/useLoyalty";
import { AppLoader } from "../../components/ui/AppLoader";
import { BadgeTier, TIER_NAMES } from "../../types/loyalty";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";
import { lamportsToSOL } from "../../utils/formatters";

export function LoyaltyBenefitsScreen() {
  const { loyaltyBenefits, userAttendance, isLoading, error, fetchLoyaltyBenefits } = useLoyalty();

  // Explicitly fetch on mount
  useEffect(() => {
    fetchLoyaltyBenefits();
  }, []);

  const tier = loyaltyBenefits?.currentTier ?? BadgeTier.None;
  const totalEvents = loyaltyBenefits?.totalEvents ?? 0;
  const lifetimeSpend = loyaltyBenefits?.lifetimeSpend ?? 0;
  const currentStreak = loyaltyBenefits?.currentStreak ?? 0;
  const longestStreak = userAttendance?.longestStreak ?? 0;
  const multiplier = loyaltyBenefits?.streakBonusMultiplier ?? 100;

  const achievements = useMemo(
    () => getAchievements(totalEvents, currentStreak, longestStreak, lifetimeSpend),
    [totalEvents, currentStreak, longestStreak, lifetimeSpend]
  );
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  if (isLoading) {
    return <AppLoader fullScreen message="Loading loyalty data..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Section */}
      <LinearGradient
        colors={[colors.surface, colors.background]}
        style={styles.hero}
      >
        <TierBadge tier={tier} size="large" />
        <Text style={styles.tierTitle}>{TIER_NAMES[tier]} Member</Text>

        <View style={styles.statsRow}>
          <StatItem value={totalEvents.toString()} label="Events" />
          <View style={styles.statDivider} />
          <StatItem value={`${lamportsToSOL(lifetimeSpend).toFixed(2)}`} label="SOL Spent" />
          <View style={styles.statDivider} />
          <StatItem value={currentStreak.toString()} label="Streak" />
        </View>
      </LinearGradient>

      {/* Error banner */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            Failed to load loyalty data: {error}
          </Text>
        </View>
      )}

      {/* Streak */}
      <AppCard style={styles.section}>
        <StreakDisplay
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          multiplier={multiplier}
        />
      </AppCard>

      {/* Attendance Calendar */}
      <AppCard style={styles.section}>
        <StreakCalendar
          currentStreak={currentStreak}
          lastAttendanceDate={userAttendance?.lastAttendanceDate ?? 0}
        />
      </AppCard>

      {/* Progress */}
      <AppCard style={styles.section}>
        <Text style={styles.sectionTitle}>Tier Progress</Text>
        <TierProgressBar currentEvents={totalEvents} currentTier={tier} />
      </AppCard>

      {/* Benefits */}
      <AppCard style={styles.section}>
        <Text style={styles.sectionTitle}>Your Benefits</Text>

        <BenefitRow
          icon="bag-handle-outline"
          title="Merchant Discount"
          value={`${loyaltyBenefits?.merchantDiscount ?? 0}% off`}
          active={(loyaltyBenefits?.merchantDiscount ?? 0) > 0}
        />
        <BenefitRow
          icon="ticket-outline"
          title="Ticket Discount"
          value={`${loyaltyBenefits?.ticketDiscount ?? 0}% off`}
          active={(loyaltyBenefits?.ticketDiscount ?? 0) > 0}
        />
        <BenefitRow
          icon="time-outline"
          title="Early Access"
          value={
            (loyaltyBenefits?.earlyAccessHours ?? 0) > 0
              ? `${loyaltyBenefits?.earlyAccessHours}h before public sale`
              : "Not available"
          }
          active={(loyaltyBenefits?.earlyAccessHours ?? 0) > 0}
        />
        <BenefitRow
          icon="enter-outline"
          title="Priority Entry"
          value={loyaltyBenefits?.hasPriorityEntry ? "Unlocked" : "Locked"}
          active={loyaltyBenefits?.hasPriorityEntry ?? false}
        />
        <BenefitRow
          icon="star-outline"
          title="VIP Lounge"
          value={loyaltyBenefits?.hasVipLounge ? "Unlocked" : "Locked"}
          active={loyaltyBenefits?.hasVipLounge ?? false}
        />
        <BenefitRow
          icon="car-outline"
          title="Free Parking"
          value={loyaltyBenefits?.hasFreeParking ? "Unlocked" : "Locked"}
          active={loyaltyBenefits?.hasFreeParking ?? false}
        />
        <BenefitRow
          icon="headset-outline"
          title="Concierge Support"
          value={loyaltyBenefits?.hasConciergeSupport ? "Unlocked" : "Locked"}
          active={loyaltyBenefits?.hasConciergeSupport ?? false}
          last
        />
      </AppCard>

      {/* Achievements */}
      <View style={styles.achievementsSection}>
        <Text style={styles.sectionTitlePadded}>
          Achievements ({unlockedCount}/{achievements.length})
        </Text>
        {achievements.map((a) => (
          <AchievementCard key={a.id} achievement={a} />
        ))}
      </View>
    </ScrollView>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function BenefitRow({
  icon,
  title,
  value,
  active,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  active: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.benefitRow, !last && styles.benefitBorder]}>
      <Ionicons name={icon} size={20} color={colors.textMuted} style={styles.benefitIcon} />
      <View style={styles.benefitInfo}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={[styles.benefitValue, active && styles.benefitActive]}>
          {value}
        </Text>
      </View>
      {active ? (
        <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />
      ) : (
        <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: "center",
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  tierTitle: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  statItem: {
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
    height: 30,
    backgroundColor: colors.border,
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderRadius: 12,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.25)",
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.error,
    lineHeight: 18,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
  },
  benefitBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  benefitIcon: {
    marginRight: spacing.sm + 2,
  },
  benefitInfo: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
  benefitValue: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
    marginTop: 1,
  },
  benefitActive: {
    color: colors.primary,
  },
  achievementsSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  sectionTitlePadded: {
    fontSize: 18,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    marginBottom: spacing.md,
  },
});
