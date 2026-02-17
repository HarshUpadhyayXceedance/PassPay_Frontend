import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BadgeTier, TIER_NAMES } from "../../types/loyalty";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

interface TierBadgeProps {
  tier: BadgeTier;
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
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
  [BadgeTier.Bronze]: ["#CD7F32", "#E6A55C"],
  [BadgeTier.Silver]: ["#8E9AAF", "#C0C0C0"],
  [BadgeTier.Gold]: ["#DAA520", "#FFD700"],
  [BadgeTier.Platinum]: ["#9DB2BF", "#E5E4E2"],
};

export function TierBadge({ tier, size = "medium", showLabel = true }: TierBadgeProps) {
  if (tier === BadgeTier.None) {
    return (
      <View style={[styles.badge, sizeStyles[size].badge, styles.noneBadge]}>
        <Text style={[styles.text, sizeStyles[size].text, { color: colors.textMuted }]}>
          No Tier
        </Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={TIER_GRADIENTS[tier]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, sizeStyles[size].badge]}
    >
      <Text style={sizeStyles[size].icon}>{TIER_ICON[tier]}</Text>
      {showLabel && (
        <Text style={[styles.text, sizeStyles[size].text]}>
          {TIER_NAMES[tier]}
        </Text>
      )}
    </LinearGradient>
  );
}

const sizeStyles = {
  small: StyleSheet.create({
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    text: { fontSize: 10 },
    icon: { fontSize: 10, marginRight: 3 },
  }),
  medium: StyleSheet.create({
    badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
    text: { fontSize: 12 },
    icon: { fontSize: 14, marginRight: 4 },
  }),
  large: StyleSheet.create({
    badge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
    text: { fontSize: 16 },
    icon: { fontSize: 20, marginRight: 6 },
  }),
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  noneBadge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    color: "#1A1A2E",
    fontFamily: fonts.bodyBold,
    letterSpacing: 0.5,
  },
});
