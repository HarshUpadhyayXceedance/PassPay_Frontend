import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  multiplier: number;
}

export function StreakDisplay({ currentStreak, longestStreak, multiplier }: StreakDisplayProps) {
  const formattedMultiplier = (multiplier / 100).toFixed(1);
  const hasStreak = currentStreak > 0;

  return (
    <View style={styles.container}>
      <View style={styles.streakRow}>
        <Text style={styles.fireIcon}>{hasStreak ? "\u{1F525}" : "\u{2744}\u{FE0F}"}</Text>
        <Text style={[styles.streakCount, hasStreak && styles.streakActive]}>
          {currentStreak}
        </Text>
        <Text style={styles.streakLabel}>
          {hasStreak ? "Event Streak" : "No Active Streak"}
        </Text>
      </View>
      {hasStreak && (
        <View style={styles.detailsRow}>
          <Text style={styles.multiplierText}>{formattedMultiplier}x bonus</Text>
          <Text style={styles.separator}>{"\u{2022}"}</Text>
          <Text style={styles.longestText}>Best: {longestStreak}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fireIcon: {
    fontSize: 20,
  },
  streakCount: {
    fontSize: 22,
    fontFamily: fonts.heading,
    color: colors.textMuted,
  },
  streakActive: {
    color: colors.warning,
  },
  streakLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  multiplierText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },
  separator: {
    color: colors.textMuted,
    fontSize: 8,
  },
  longestText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
});
