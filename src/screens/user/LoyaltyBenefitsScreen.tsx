import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { TierBadge } from "../../components/loyalty/TierBadge";
import { TierProgressBar } from "../../components/loyalty/TierProgressBar";
import { StreakDisplay } from "../../components/loyalty/StreakDisplay";
import { AppCard } from "../../components/ui/AppCard";
import { useLoyalty } from "../../hooks/useLoyalty";
import { AppLoader } from "../../components/ui/AppLoader";
import { BadgeTier, TIER_NAMES } from "../../types/loyalty";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";
import { lamportsToSOL } from "../../utils/formatters";

export function LoyaltyBenefitsScreen() {
  const { loyaltyBenefits, userAttendance, isLoading } = useLoyalty();

  if (isLoading) {
    return <AppLoader fullScreen message="Loading loyalty data..." />;
  }

  const tier = loyaltyBenefits?.currentTier ?? BadgeTier.None;
  const totalEvents = loyaltyBenefits?.totalEvents ?? 0;
  const lifetimeSpend = loyaltyBenefits?.lifetimeSpend ?? 0;
  const currentStreak = loyaltyBenefits?.currentStreak ?? 0;
  const longestStreak = userAttendance?.longestStreak ?? 0;
  const multiplier = loyaltyBenefits?.streakBonusMultiplier ?? 100;

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

      {/* Streak */}
      <AppCard style={styles.section}>
        <StreakDisplay
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          multiplier={multiplier}
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
          icon="🛍️"
          title="Merchant Discount"
          value={`${loyaltyBenefits?.merchantDiscount ?? 0}% off`}
          active={(loyaltyBenefits?.merchantDiscount ?? 0) > 0}
        />
        <BenefitRow
          icon="🎫"
          title="Ticket Discount"
          value={`${loyaltyBenefits?.ticketDiscount ?? 0}% off`}
          active={(loyaltyBenefits?.ticketDiscount ?? 0) > 0}
        />
        <BenefitRow
          icon="⏰"
          title="Early Access"
          value={
            (loyaltyBenefits?.earlyAccessHours ?? 0) > 0
              ? `${loyaltyBenefits?.earlyAccessHours}h before public sale`
              : "Not available"
          }
          active={(loyaltyBenefits?.earlyAccessHours ?? 0) > 0}
        />
        <BenefitRow
          icon="🚪"
          title="Priority Entry"
          value={loyaltyBenefits?.hasPriorityEntry ? "Unlocked" : "Locked"}
          active={loyaltyBenefits?.hasPriorityEntry ?? false}
        />
        <BenefitRow
          icon="🛋️"
          title="VIP Lounge"
          value={loyaltyBenefits?.hasVipLounge ? "Unlocked" : "Locked"}
          active={loyaltyBenefits?.hasVipLounge ?? false}
        />
        <BenefitRow
          icon="🚗"
          title="Free Parking"
          value={loyaltyBenefits?.hasFreeParking ? "Unlocked" : "Locked"}
          active={loyaltyBenefits?.hasFreeParking ?? false}
        />
        <BenefitRow
          icon="📞"
          title="Concierge Support"
          value={loyaltyBenefits?.hasConciergeSupport ? "Unlocked" : "Locked"}
          active={loyaltyBenefits?.hasConciergeSupport ?? false}
          last
        />
      </AppCard>
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
  icon: string;
  title: string;
  value: string;
  active: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.benefitRow, !last && styles.benefitBorder]}>
      <Text style={styles.benefitIcon}>{icon}</Text>
      <View style={styles.benefitInfo}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={[styles.benefitValue, active && styles.benefitActive]}>
          {value}
        </Text>
      </View>
      {active ? (
        <Text style={styles.checkmark}>✅</Text>
      ) : (
        <Text style={styles.lockIcon}>🔒</Text>
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
    fontSize: 20,
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
  checkmark: {
    fontSize: 16,
  },
  lockIcon: {
    fontSize: 14,
  },
});
