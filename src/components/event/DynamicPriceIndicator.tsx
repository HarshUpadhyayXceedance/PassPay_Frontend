import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

interface DynamicPriceIndicatorProps {
  isEnabled: boolean;
  basePrice: number;
  currentPrice: number;
}

export function DynamicPriceIndicator({
  isEnabled,
  basePrice,
  currentPrice,
}: DynamicPriceIndicatorProps) {
  if (!isEnabled) return null;

  const diff = currentPrice - basePrice;
  const pctChange = basePrice > 0 ? ((diff / basePrice) * 100).toFixed(0) : "0";
  const isUp = diff > 0;
  const isDown = diff < 0;

  return (
    <View style={[styles.container, isUp ? styles.up : isDown ? styles.down : styles.neutral]}>
      <Text style={styles.icon}>
        {isUp ? "\u{1F525}" : isDown ? "\u{2744}\u{FE0F}" : "\u{26A1}"}
      </Text>
      <Text style={[styles.text, isUp ? styles.textUp : isDown ? styles.textDown : styles.textNeutral]}>
        {isUp ? `+${pctChange}%` : isDown ? `${pctChange}%` : "Live"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  up: {
    backgroundColor: colors.errorLight,
  },
  down: {
    backgroundColor: colors.successLight,
  },
  neutral: {
    backgroundColor: colors.warningLight,
  },
  icon: {
    fontSize: 11,
  },
  text: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
  },
  textUp: {
    color: colors.error,
  },
  textDown: {
    color: colors.primary,
  },
  textNeutral: {
    color: colors.warning,
  },
});
