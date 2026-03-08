import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  unlocked: boolean;
  progress: number;
  target: string;
}

interface AchievementCardProps {
  achievement: Achievement;
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  const { title, description, icon, unlocked, progress, target } = achievement;
  const percent = Math.min(Math.round(progress * 100), 100);

  return (
    <View style={[styles.container, unlocked && styles.containerUnlocked]}>
      <View
        style={[
          styles.iconWrap,
          unlocked ? styles.iconWrapUnlocked : styles.iconWrapLocked,
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={unlocked ? colors.background : colors.textMuted}
        />
      </View>

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, unlocked && styles.titleUnlocked]}>
            {title}
          </Text>
          {unlocked && (
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          )}
        </View>
        <Text style={styles.description}>{description}</Text>

        {!unlocked && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${percent}%` }]}
              />
            </View>
            <Text style={styles.progressText}>{target}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function getAchievements(
  totalEvents: number,
  currentStreak: number,
  longestStreak: number,
  lifetimeSpendLamports: number
): Achievement[] {
  const solSpent = lifetimeSpendLamports / 1_000_000_000;

  return [
    {
      id: "first_event",
      title: "First Timer",
      description: "Attend your first event",
      icon: "star-outline",
      unlocked: totalEvents >= 1,
      progress: Math.min(totalEvents / 1, 1),
      target: `${Math.min(totalEvents, 1)}/1 event`,
    },
    {
      id: "event_5",
      title: "Regular",
      description: "Attend 5 events",
      icon: "calendar-outline",
      unlocked: totalEvents >= 5,
      progress: Math.min(totalEvents / 5, 1),
      target: `${Math.min(totalEvents, 5)}/5 events`,
    },
    {
      id: "event_10",
      title: "Superfan",
      description: "Attend 10 events",
      icon: "flame-outline",
      unlocked: totalEvents >= 10,
      progress: Math.min(totalEvents / 10, 1),
      target: `${Math.min(totalEvents, 10)}/10 events`,
    },
    {
      id: "streak_3",
      title: "On a Roll",
      description: "Reach a 3-event streak",
      icon: "trending-up-outline",
      unlocked: longestStreak >= 3,
      progress: Math.min(longestStreak / 3, 1),
      target: `${Math.min(longestStreak, 3)}/3 streak`,
    },
    {
      id: "streak_7",
      title: "Unstoppable",
      description: "Reach a 7-event streak",
      icon: "rocket-outline",
      unlocked: longestStreak >= 7,
      progress: Math.min(longestStreak / 7, 1),
      target: `${Math.min(longestStreak, 7)}/7 streak`,
    },
    {
      id: "spend_1",
      title: "Supporter",
      description: "Spend 1 SOL on tickets",
      icon: "wallet-outline",
      unlocked: solSpent >= 1,
      progress: Math.min(solSpent / 1, 1),
      target: `${Math.min(solSpent, 1).toFixed(2)}/1.00 SOL`,
    },
    {
      id: "spend_5",
      title: "Big Spender",
      description: "Spend 5 SOL on tickets",
      icon: "diamond-outline",
      unlocked: solSpent >= 5,
      progress: Math.min(solSpent / 5, 1),
      target: `${Math.min(solSpent, 5).toFixed(2)}/5.00 SOL`,
    },
    {
      id: "event_25",
      title: "Legend",
      description: "Attend 25 events",
      icon: "trophy-outline",
      unlocked: totalEvents >= 25,
      progress: Math.min(totalEvents / 25, 1),
      target: `${Math.min(totalEvents, 25)}/25 events`,
    },
  ];
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm + 2,
    borderRadius: 12,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  containerUnlocked: {
    borderColor: colors.primaryMuted,
    backgroundColor: "rgba(0, 255, 163, 0.04)",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm + 2,
  },
  iconWrapUnlocked: {
    backgroundColor: colors.primary,
  },
  iconWrapLocked: {
    backgroundColor: colors.surfaceLight,
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
  },
  titleUnlocked: {
    color: colors.text,
  },
  description: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
    marginTop: 1,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 6,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceLight,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: colors.textMuted,
    minWidth: 70,
    textAlign: "right",
  },
});
