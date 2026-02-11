import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { colors } from "../../theme/colors";
import { borderRadius, spacing } from "../../theme/spacing";

interface AppCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function AppCard({ children, onPress, style }: AppCardProps) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
