export const colors = {
  // Primary neon cyan/green (from designs)
  primary: "#00FFA3",
  primaryLight: "#5AFFCD",
  primaryDark: "#00CC82",

  // Secondary purple
  secondary: "#6C5CE7",
  secondaryLight: "#A29BFE",

  // Accent cyan
  accent: "#00CEC9",
  accentLight: "#81ECEC",

  // Dark backgrounds (matching designs)
  background: "#0A0E1A",
  backgroundSecondary: "#0F1419",
  surface: "#141829",
  surfaceLight: "#1E2235",
  card: "#16192D",
  cardBorder: "#1E2440",

  // Text colors
  text: "#FFFFFF",
  textSecondary: "#8F95B2",
  textMuted: "#4A4E69",
  textDisabled: "#2D3142",

  // Status colors
  success: "#00FFA3",
  error: "#FF4757",
  warning: "#FFA502",
  info: "#3742FA",

  // UI elements
  border: "#1E2440",
  divider: "#1A1F3A",
  inputBg: "#0F1419",
  buttonBg: "#1E2235",

  // Special
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
  overlay: "rgba(10, 14, 26, 0.9)",
} as const;

export type ColorKey = keyof typeof colors;
