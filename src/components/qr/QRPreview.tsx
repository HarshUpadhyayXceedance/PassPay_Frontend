import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { QRGenerator } from "./QRGenerator";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing, borderRadius } from "../../theme/spacing";

interface QRPreviewProps {
  data: string;
  title: string;
  subtitle?: string;
  size?: number;
}

export function QRPreview({
  data,
  title,
  subtitle,
  size = 200,
}: QRPreviewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      <View style={styles.qrWrapper}>
        <QRGenerator value={data} size={size} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  qrWrapper: {
    marginTop: spacing.sm,
  },
});
