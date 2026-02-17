import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { AppHeader } from "../../components/ui/AppHeader";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";

export function AboutScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <AppHeader title="About" onBack={() => router.back()} />

      <View style={styles.content}>
        <Text style={styles.appName}>PassPay</Text>
        <Text style={styles.version}>Version 1.0.0</Text>

        <Text style={styles.description}>
          PassPay is a decentralized event ticketing and payments platform built
          on Solana. Buy NFT tickets (ProofPass), verify attendance with
          on-chain check-ins, and pay merchants inside events using Scan2Pay.
        </Text>

        <View style={styles.tech}>
          <Text style={styles.techTitle}>Built with</Text>
          <Text style={styles.techItem}>Solana Blockchain</Text>
          <Text style={styles.techItem}>Anchor Framework</Text>
          <Text style={styles.techItem}>Metaplex NFT Standard</Text>
          <Text style={styles.techItem}>React Native + Expo</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    alignItems: "center",
    paddingTop: spacing.xxl,
  },
  appName: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  version: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  tech: {
    alignItems: "center",
  },
  techTitle: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  techItem: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
});
