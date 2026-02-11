import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AppCard } from "../ui/AppCard";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { MerchantDisplay } from "../../types/merchant";
import { formatSOL } from "../../utils/formatters";

interface MerchantCardProps {
  merchant: MerchantDisplay;
  onPress?: () => void;
}

export function MerchantCard({ merchant, onPress }: MerchantCardProps) {
  return (
    <AppCard onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {merchant.name}
        </Text>
        <View
          style={[
            styles.statusDot,
            merchant.isActive ? styles.active : styles.inactive,
          ]}
        />
      </View>

      <View style={styles.stats}>
        <Text style={styles.label}>Total Received</Text>
        <Text style={styles.value}>
          {formatSOL(merchant.totalReceived)} SOL
        </Text>
      </View>

      <Text style={styles.address} numberOfLines={1}>
        {merchant.authority}
      </Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  name: {
    ...typography.bodyBold,
    color: colors.text,
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  active: {
    backgroundColor: colors.success,
  },
  inactive: {
    backgroundColor: colors.error,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  value: {
    ...typography.bodyBold,
    color: colors.secondary,
  },
  address: {
    ...typography.small,
    color: colors.textMuted,
    fontFamily: "monospace",
  },
});
