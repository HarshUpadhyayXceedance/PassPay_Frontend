import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { BadgeTier, TIER_NAMES } from "../../types/loyalty";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

interface DiscountPillProps {
  percentage: number;
  tier: BadgeTier;
}

const TIER_COLOR: Record<BadgeTier, string> = {
  [BadgeTier.None]: colors.textMuted,
  [BadgeTier.Bronze]: colors.tierBronze,
  [BadgeTier.Silver]: colors.tierSilver,
  [BadgeTier.Gold]: colors.tierGold,
  [BadgeTier.Platinum]: colors.tierPlatinum,
};

const TIER_BG: Record<BadgeTier, string> = {
  [BadgeTier.None]: "transparent",
  [BadgeTier.Bronze]: colors.tierBronzeLight,
  [BadgeTier.Silver]: colors.tierSilverLight,
  [BadgeTier.Gold]: colors.tierGoldLight,
  [BadgeTier.Platinum]: colors.tierPlatinumLight,
};

export function DiscountPill({ percentage, tier }: DiscountPillProps) {
  if (percentage <= 0) return null;

  return (
    <View style={[styles.pill, { backgroundColor: TIER_BG[tier] }]}>
      <Text style={[styles.text, { color: TIER_COLOR[tier] }]}>
        -{percentage}% {TIER_NAMES[tier]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.3,
  },
});
