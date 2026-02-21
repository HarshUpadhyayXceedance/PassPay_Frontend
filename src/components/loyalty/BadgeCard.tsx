import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BadgeTier, TIER_NAMES, TIER_THRESHOLDS } from "../../types/loyalty";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";

interface BadgeCardProps {
  tier: BadgeTier;
  isEarned: boolean;
  totalEvents: number;
  isClaimed?: boolean;
  onClaim?: () => void;
  isClaiming?: boolean;
}

const TIER_ICON: Record<BadgeTier, string> = {
  [BadgeTier.None]: "",
  [BadgeTier.Bronze]: "\u{1F949}",
  [BadgeTier.Silver]: "\u{1F948}",
  [BadgeTier.Gold]: "\u{1F947}",
  [BadgeTier.Platinum]: "\u{1F48E}",
};

const TIER_GRADIENTS: Record<BadgeTier, readonly [string, string, ...string[]]> = {
  [BadgeTier.None]: [colors.surface, colors.surfaceLight],
  [BadgeTier.Bronze]: ["#CD7F32", "#8B5E3C"],
  [BadgeTier.Silver]: ["#C0C0C0", "#808080"],
  [BadgeTier.Gold]: ["#FFD700", "#B8860B"],
  [BadgeTier.Platinum]: ["#E5E4E2", "#9DB2BF"],
};

export function BadgeCard({
  tier,
  isEarned,
  totalEvents,
  isClaimed,
  onClaim,
  isClaiming,
}: BadgeCardProps) {
  const threshold = TIER_THRESHOLDS[tier];
  const progress = Math.min(totalEvents / threshold, 1);

  return (
    <View style={[styles.card, !isEarned && styles.cardLocked]}>
      <LinearGradient
        colors={
          isEarned
            ? TIER_GRADIENTS[tier]
            : [colors.surface, colors.surfaceLight]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconContainer}
      >
        <Text style={styles.icon}>
          {isEarned ? TIER_ICON[tier] : "\u{1F512}"}
        </Text>
      </LinearGradient>

      <Text style={[styles.name, !isEarned && styles.textLocked]}>
        {TIER_NAMES[tier]}
      </Text>

      {isEarned ? (
        isClaimed ? (
          <View style={styles.claimedBadge}>
            <Text style={styles.claimedText}>Claimed</Text>
          </View>
        ) : onClaim ? (
          <TouchableOpacity
            style={styles.claimButton}
            onPress={onClaim}
            disabled={isClaiming}
            activeOpacity={0.7}
          >
            {isClaiming ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.claimButtonText}>Claim NFT</Text>
            )}
          </TouchableOpacity>
        ) : (
          <Text style={styles.earnedText}>Earned</Text>
        )
      ) : (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.requirementText}>
            {totalEvents}/{threshold} events
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  cardLocked: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 28,
  },
  name: {
    fontSize: 14,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  textLocked: {
    color: colors.textMuted,
  },
  earnedText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },
  claimButton: {
    backgroundColor: colors.secondary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 80,
    alignItems: "center",
  },
  claimButtonText: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    color: "#fff",
  },
  claimedBadge: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  claimedText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },
  progressSection: {
    width: "100%",
    alignItems: "center",
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  requirementText: {
    fontSize: 10,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
});
