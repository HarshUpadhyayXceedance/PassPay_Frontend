import React from "react";
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { borderRadius, spacing } from "../../theme/spacing";

type IoniconsName = keyof typeof Ionicons.glyphMap;

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  selected?: boolean;
  icon?: IoniconsName;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const GRADIENT_COLORS: Record<string, readonly [string, string]> = {
  primary: colors.gradientPrimary as unknown as [string, string],
  secondary: colors.gradientSecondary as unknown as [string, string],
};

const TRANSPARENT_GRADIENT: readonly [string, string] = [
  "transparent",
  "transparent",
];

const SHADOW_STYLES: Record<string, ViewStyle> = {
  primary: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  secondary: {
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
};

export function AppButton({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  selected = false,
  icon,
  style,
  textStyle,
}: AppButtonProps) {
  const isDisabled = disabled || loading;


  const resolved = selected ? "secondary" : variant;
  const useGradient = resolved === "primary" || resolved === "secondary";


  const gradientColors = useGradient
    ? GRADIENT_COLORS[resolved]
    : TRANSPARENT_GRADIENT;


  const foreground =
    resolved === "outline" || resolved === "ghost"
      ? colors.primary
      : resolved === "danger"
      ? colors.white
      : colors.white;


  const loaderColor =
    resolved === "outline" || resolved === "ghost"
      ? colors.primary
      : colors.background;


  const surfaceStyle: ViewStyle[] = [styles.surface, styles[`size_${size}`]];
  if (resolved === "outline") {
    surfaceStyle.push(styles.outlineSurface);
  } else if (resolved === "ghost") {
    surfaceStyle.push(styles.ghostSurface);
  } else if (resolved === "danger") {
    surfaceStyle.push(styles.dangerSurface);
  }


  const wrapperStyle: ViewStyle[] = [styles.wrapper];
  if (useGradient) {
    const shadow = SHADOW_STYLES[resolved];
    if (shadow) wrapperStyle.push(shadow);
  }
  if (isDisabled) wrapperStyle.push(styles.disabled);
  if (style) wrapperStyle.push(style);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={useGradient ? 0.8 : 0.7}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled }}
      style={wrapperStyle}
    >
      <LinearGradient
        colors={gradientColors as unknown as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={surfaceStyle}
      >
        {loading ? (
          <ActivityIndicator color={loaderColor} size="small" />
        ) : (
          <View style={styles.content}>
            {icon && (
              <Ionicons
                name={icon}
                size={size === "sm" ? 16 : size === "lg" ? 22 : 18}
                color={foreground}
                style={styles.icon}
              />
            )}
            <Text
              style={[
                styles.text,
                styles[`textSize_${size}`],
                { color: foreground },
                textStyle,
              ]}
            >
              {title}
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  surface: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.md,
  },
  outlineSurface: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghostSurface: {

  },
  dangerSurface: {
    backgroundColor: colors.error,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: spacing.xs + 2,
  },
  size_sm: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  size_md: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  size_lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 56,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.button,
  },
  textSize_sm: {
    fontSize: 14,
  },
  textSize_md: {
    fontSize: 16,
  },
  textSize_lg: {
    fontSize: 18,
  },
});
