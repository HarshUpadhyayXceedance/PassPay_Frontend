import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { BadgeCard } from "../../components/loyalty/BadgeCard";
import { AppLoader } from "../../components/ui/AppLoader";
import { useLoyalty } from "../../hooks/useLoyalty";
import { BadgeTier } from "../../types/loyalty";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";

export function BadgeCollectionScreen() {
  const { loyaltyBenefits, isLoading } = useLoyalty();

  if (isLoading) {
    return <AppLoader fullScreen message="Loading badges..." />;
  }

  const tier = loyaltyBenefits?.currentTier ?? BadgeTier.None;
  const totalEvents = loyaltyBenefits?.totalEvents ?? 0;

  const tiers = [BadgeTier.Bronze, BadgeTier.Silver, BadgeTier.Gold, BadgeTier.Platinum];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Badge Collection</Text>
        <Text style={styles.subtitle}>
          Earn soulbound NFT badges by attending events
        </Text>
      </View>

      <View style={styles.grid}>
        {tiers.map((t) => (
          <BadgeCard
            key={t}
            tier={t}
            isEarned={tier >= t}
            totalEvents={totalEvents}
          />
        ))}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>How Badges Work</Text>
        <Text style={styles.infoText}>
          Badges are soulbound NFTs minted when you check in at events.
          They cannot be transferred and serve as proof of your attendance
          history. Each tier unlocks additional benefits and discounts.
        </Text>
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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm + 4,
    marginBottom: spacing.xl,
  },
  infoBox: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
  },
  infoTitle: {
    fontSize: 15,
    fontFamily: fonts.headingSemiBold,
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
