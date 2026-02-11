import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";

interface AppLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export function AppLoader({
  message = "Loading...",
  fullScreen = false,
}: AppLoaderProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  message: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
