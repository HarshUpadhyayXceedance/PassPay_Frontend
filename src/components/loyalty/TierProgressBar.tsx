import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  BadgeTier,
  TIER_NAMES,
  TIER_THRESHOLDS,
  getNextTier,
  getEventsToNextTier,
} from "../../types/loyalty";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";

interface TierProgressBarProps {
  currentEvents: number;
  currentTier: BadgeTier;
}

export function TierProgressBar({ currentEvents, currentTier }: TierProgressBarProps) {
  const nextTier = getNextTier(currentTier);
  const eventsNeeded = getEventsToNextTier(currentEvents, currentTier);

  if (nextTier === null) {
    return (
      <View style={styles.container}>
        <View style={styles.maxedRow}>
          <Text style={styles.maxedText}>Max Tier Reached</Text>
          <Text style={styles.maxedIcon}>{"\u{1F48E}"}</Text>
        </View>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: "100%" }]}
          />
        </View>
      </View>
    );
  }

  const nextThreshold = TIER_THRESHOLDS[nextTier];
  const currentThreshold = TIER_THRESHOLDS[currentTier];
  const range = nextThreshold - currentThreshold;
  const progress = range > 0
    ? Math.min((currentEvents - currentThreshold) / range, 1)
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.currentLabel}>{TIER_NAMES[currentTier]}</Text>
        <Text style={styles.nextLabel}>
          {eventsNeeded} more to {TIER_NAMES[nextTier]}
        </Text>
      </View>
      <View style={styles.progressBar}>
        <LinearGradient
          colors={colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${progress * 100}%` }]}
        />
      </View>
      <View style={styles.countRow}>
        <Text style={styles.countText}>{currentEvents} events</Text>
        <Text style={styles.countText}>{nextThreshold} events</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  currentLabel: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },
  nextLabel: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  maxedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
    gap: 6,
  },
  maxedText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },
  maxedIcon: {
    fontSize: 16,
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  countText: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
});
