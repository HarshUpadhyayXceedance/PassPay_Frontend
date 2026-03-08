import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { BadgeTier, TIER_NAMES, TIER_BENEFITS } from "../../types/loyalty";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

interface EarlyAccessBadgeProps {
  earlyAccessDate: number;
  publicSaleDate: number;
  userTier: BadgeTier;
}

export function EarlyAccessBadge({
  earlyAccessDate,
  publicSaleDate,
  userTier,
}: EarlyAccessBadgeProps) {
  const now = Date.now() / 1000;


  if (now >= publicSaleDate || earlyAccessDate === 0) return null;

  const userEarlyAccessHours = TIER_BENEFITS[userTier]?.earlyAccessHours ?? 0;
  const userEarlyAccessDate = publicSaleDate - userEarlyAccessHours * 3600;
  const canAccess = now >= userEarlyAccessDate && userEarlyAccessHours > 0;

  if (canAccess) {
    return (
      <View style={[styles.badge, styles.accessGranted]}>
        <Text style={styles.icon}>{"\u{2B50}"}</Text>
        <Text style={[styles.text, styles.textGranted]}>Early Access</Text>
      </View>
    );
  }


  const hoursToPublic = Math.max(0, Math.ceil((publicSaleDate - now) / 3600));

  return (
    <View style={[styles.badge, styles.accessLocked]}>
      <Text style={styles.icon}>{"\u{1F512}"}</Text>
      <Text style={[styles.text, styles.textLocked]}>
        Public sale in {hoursToPublic}h
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    alignSelf: "flex-start",
  },
  accessGranted: {
    backgroundColor: colors.warningLight,
  },
  accessLocked: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    fontSize: 12,
  },
  text: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
  },
  textGranted: {
    color: colors.warning,
  },
  textLocked: {
    color: colors.textMuted,
  },
});
