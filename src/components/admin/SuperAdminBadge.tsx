import React from "react";
import { Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

interface SuperAdminBadgeProps {
  size?: "small" | "medium" | "large";
}

export function SuperAdminBadge({ size = "medium" }: SuperAdminBadgeProps) {
  const sizeStyles = {
    small: {
      badge: styles.badgeSmall,
      text: styles.textSmall,
      icon: styles.iconSmall,
    },
    medium: {
      badge: styles.badgeMedium,
      text: styles.textMedium,
      icon: styles.iconMedium,
    },
    large: {
      badge: styles.badgeLarge,
      text: styles.textLarge,
      icon: styles.iconLarge,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <LinearGradient
      colors={["#9333EA", "#C026D3", "#DB2777"]} // Purple to Pink gradient
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, currentSize.badge]}
    >
      <Ionicons
        name="flash"
        size={size === "small" ? 12 : size === "large" ? 18 : 14}
        color="#FFFFFF"
        style={currentSize.icon}
      />
      <Text style={[styles.text, currentSize.text]}>SUPER ADMIN</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: "#9333EA",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeMedium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  iconSmall: {
    marginRight: 3,
  },
  iconMedium: {
    marginRight: 4,
  },
  iconLarge: {
    marginRight: 6,
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  textSmall: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "700",
  },
  textMedium: {
    ...typography.body,
    fontSize: 12,
    fontWeight: "700",
  },
  textLarge: {
    ...typography.h4,
    fontSize: 14,
    fontWeight: "700",
  },
});
