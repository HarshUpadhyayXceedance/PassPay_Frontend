export const colors = {
  // Primary neon green
  primary: "#00FFA3",
  primaryLight: "#5AFFCD",
  primaryDark: "#00CC82",
  primaryMuted: "rgba(0, 255, 163, 0.15)",

  // Secondary purple
  secondary: "#6C5CE7",
  secondaryLight: "#A29BFE",
  secondaryDark: "#5541D9",
  secondaryMuted: "rgba(108, 92, 231, 0.15)",

  // Accent cyan
  accent: "#00CEC9",
  accentLight: "#81ECEC",
  accentMuted: "rgba(0, 206, 201, 0.15)",

  // Dark backgrounds
  background: "#0A0E1A",
  backgroundSecondary: "#0F1419",
  surface: "#141829",
  surfaceLight: "#1E2235",
  card: "#16192D",
  cardBorder: "#1E2440",
  cardElevated: "#1A1E33",

  // Text colors
  text: "#FFFFFF",
  textSecondary: "#8F95B2",
  textMuted: "#4A4E69",
  textDisabled: "#2D3142",

  // Status colors
  success: "#00FFA3",
  successLight: "rgba(0, 255, 163, 0.15)",
  error: "#FF4757",
  errorLight: "rgba(255, 71, 87, 0.15)",
  warning: "#FFA502",
  warningLight: "rgba(255, 165, 2, 0.15)",
  info: "#3742FA",
  infoLight: "rgba(55, 66, 250, 0.15)",

  // Badge tier colors
  tierBronze: "#CD7F32",
  tierBronzeLight: "rgba(205, 127, 50, 0.15)",
  tierSilver: "#C0C0C0",
  tierSilverLight: "rgba(192, 192, 192, 0.15)",
  tierGold: "#FFD700",
  tierGoldLight: "rgba(255, 215, 0, 0.15)",
  tierPlatinum: "#E5E4E2",
  tierPlatinumLight: "rgba(229, 228, 226, 0.15)",

  // UI elements
  border: "#1E2440",
  borderLight: "#2A2F4A",
  divider: "#1A1F3A",
  inputBg: "#0F1419",
  buttonBg: "#1E2235",

  // Special
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
  overlay: "rgba(10, 14, 26, 0.9)",
  overlayLight: "rgba(10, 14, 26, 0.6)",

  // Gradients (start, end)
  gradientPrimary: ["#00FFA3", "#00CEC9"] as const,
  gradientSecondary: ["#6C5CE7", "#A29BFE"] as const,
  gradientSuperAdmin: ["#9333EA", "#C026D3", "#DB2777"] as const,
  gradientBronze: ["#CD7F32", "#E6A55C"] as const,
  gradientSilver: ["#C0C0C0", "#E0E0E0"] as const,
  gradientGold: ["#FFD700", "#FFE44D"] as const,
  gradientPlatinum: ["#E5E4E2", "#F5F5F5"] as const,
  gradientDark: ["#141829", "#0A0E1A"] as const,
} as const;

export type ColorKey = keyof typeof colors;
