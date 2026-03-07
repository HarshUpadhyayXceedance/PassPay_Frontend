import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing, borderRadius } from "../../theme/spacing";

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface EmptyStateViewProps {
  title: string;
  message: string;
  icon?: string;
  ionicon?: IoniconsName;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyStateView({
  title,
  message,
  icon,
  ionicon,
  actionLabel,
  onAction,
}: EmptyStateViewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        {ionicon ? (
          <Ionicons name={ionicon} size={36} color={colors.textMuted} />
        ) : icon ? (
          <Text style={styles.icon}>{icon}</Text>
        ) : (
          <Ionicons name="search-outline" size={36} color={colors.textMuted} />
        )}
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <LinearGradient
            colors={colors.gradientPrimary as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionGradient}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  message: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  actionButton: {
    borderRadius: borderRadius.md,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionGradient: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
  },
  actionText: {
    ...typography.button,
    color: colors.background,
  },
});
