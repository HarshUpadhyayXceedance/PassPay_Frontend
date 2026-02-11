import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";

export function TransactionHistoryScreen() {
  // TODO: Implement transaction history by parsing on-chain events
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transaction History</Text>
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Transaction history will be available soon.
        </Text>
        <Text style={styles.subText}>
          On-chain payment records will appear here.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
});
