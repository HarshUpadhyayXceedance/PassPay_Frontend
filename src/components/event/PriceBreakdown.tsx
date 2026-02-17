import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { BadgeTier, TIER_NAMES } from "../../types/loyalty";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";
import { formatSOL } from "../../utils/formatters";

interface PriceBreakdownProps {
  basePrice: number; // SOL
  currentPrice: number; // SOL
  discountPercent: number;
  tier: BadgeTier;
  showDynamic?: boolean;
}

export function PriceBreakdown({
  basePrice,
  currentPrice,
  discountPercent,
  tier,
  showDynamic = false,
}: PriceBreakdownProps) {
  const discountAmount = currentPrice * (discountPercent / 100);
  const finalPrice = currentPrice - discountAmount;
  const hasDynamic = showDynamic && currentPrice !== basePrice;
  const hasDiscount = discountPercent > 0;

  return (
    <View style={styles.container}>
      {hasDynamic && (
        <Row
          label="Base Price"
          value={`${formatSOL(basePrice)} SOL`}
          strikethrough
        />
      )}

      <Row
        label={hasDynamic ? "Current Price" : "Price"}
        value={`${formatSOL(currentPrice)} SOL`}
        highlight={hasDynamic}
      />

      {hasDiscount && (
        <Row
          label={`${TIER_NAMES[tier]} Discount (${discountPercent}%)`}
          value={`-${formatSOL(discountAmount)} SOL`}
          isDiscount
        />
      )}

      <View style={styles.divider} />

      <Row
        label="You Pay"
        value={`${formatSOL(finalPrice)} SOL`}
        isBold
      />

      {hasDiscount && (
        <Text style={styles.savingsText}>
          You save {formatSOL(discountAmount)} SOL with {TIER_NAMES[tier]} tier!
        </Text>
      )}
    </View>
  );
}

function Row({
  label,
  value,
  strikethrough,
  highlight,
  isDiscount,
  isBold,
}: {
  label: string;
  value: string;
  strikethrough?: boolean;
  highlight?: boolean;
  isDiscount?: boolean;
  isBold?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, isBold && styles.boldLabel]}>{label}</Text>
      <Text
        style={[
          styles.value,
          strikethrough && styles.strikethrough,
          highlight && styles.highlightValue,
          isDiscount && styles.discountValue,
          isBold && styles.boldValue,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  boldLabel: {
    fontFamily: fonts.bodyBold,
    color: colors.text,
    fontSize: 16,
  },
  value: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
  strikethrough: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
  highlightValue: {
    color: colors.warning,
  },
  discountValue: {
    color: colors.primary,
  },
  boldValue: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  savingsText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
