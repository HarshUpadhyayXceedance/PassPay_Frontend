/**
 * Font family constants used across the app.
 *
 * Font Families:
 * - Almendra: Decorative serif for display headings, brand elements
 * - Poppins: Friendly rounded geometric sans-serif (CURRENT)
 * - RobotoCondensed: Clean condensed sans-serif for body text, UI elements
 * - Inter: Modern, clean geometric sans-serif (Google's most popular)
 * - Montserrat: Modern geometric sans-serif
 * - Outfit: Clean versatile sans-serif
 * - SpaceGrotesk: Unique tech-focused sans-serif
 */
export const fonts = {
  // Display / Brand (Almendra)
  displayRegular: "Almendra-Regular",
  displayBold: "Almendra-Bold",
  displayItalic: "Almendra-Italic",
  displayBoldItalic: "Almendra-BoldItalic",

  // Body / UI (Poppins - CURRENT)
  heading: "Poppins-Bold",
  headingSemiBold: "Poppins-SemiBold",
  body: "Poppins-Regular",
  bodyMedium: "Poppins-Medium",
  bodySemiBold: "Poppins-SemiBold",
  bodyBold: "Poppins-Bold",
  bodyLight: "Poppins-Light",
  bodyItalic: "Poppins-Regular", // Poppins doesn't have italic in our set
  caption: "Poppins-Regular",
  mono: "Poppins-Regular",

  // Alternative fonts (ready to use)
  // Inter - Modern, clean, excellent readability
  interLight: "Inter-Light",
  interRegular: "Inter-Regular",
  interMedium: "Inter-Medium",
  interSemiBold: "Inter-SemiBold",
  interBold: "Inter-Bold",

  // Poppins - Friendly & rounded
  poppinsLight: "Poppins-Light",
  poppinsRegular: "Poppins-Regular",
  poppinsMedium: "Poppins-Medium",
  poppinsSemiBold: "Poppins-SemiBold",
  poppinsBold: "Poppins-Bold",

  // Montserrat - Geometric & clean
  montserratLight: "Montserrat-Light",
  montserratRegular: "Montserrat-Regular",
  montserratMedium: "Montserrat-Medium",
  montserratSemiBold: "Montserrat-SemiBold",
  montserratBold: "Montserrat-Bold",

  // Outfit - Clean & versatile
  outfitLight: "Outfit-Light",
  outfitRegular: "Outfit-Regular",
  outfitMedium: "Outfit-Medium",
  outfitSemiBold: "Outfit-SemiBold",
  outfitBold: "Outfit-Bold",

  // SpaceGrotesk - Tech-focused & unique
  spaceGroteskRegular: "SpaceGrotesk-Regular",
  spaceGroteskMedium: "SpaceGrotesk-Medium",
  spaceGroteskSemiBold: "SpaceGrotesk-SemiBold",
  spaceGroteskBold: "SpaceGrotesk-Bold",
} as const;

/**
 * Font asset map for expo-font useFonts hook.
 * Import and pass this to useFonts() in the root layout.
 */
export const fontAssets = {
  // Almendra
  "Almendra-Regular": require("../../assets/fonts/Almendra-Regular.ttf"),
  "Almendra-Bold": require("../../assets/fonts/Almendra-Bold.ttf"),
  "Almendra-Italic": require("../../assets/fonts/Almendra-Italic.ttf"),
  "Almendra-BoldItalic": require("../../assets/fonts/Almendra-BoldItalic.ttf"),

  // RobotoCondensed (CURRENT)
  "RobotoCondensed-Light": require("../../assets/fonts/RobotoCondensed-Light.ttf"),
  "RobotoCondensed-Regular": require("../../assets/fonts/RobotoCondensed-Regular.ttf"),
  "RobotoCondensed-Medium": require("../../assets/fonts/RobotoCondensed-Medium.ttf"),
  "RobotoCondensed-SemiBold": require("../../assets/fonts/RobotoCondensed-SemiBold.ttf"),
  "RobotoCondensed-Bold": require("../../assets/fonts/RobotoCondensed-Bold.ttf"),
  "RobotoCondensed-Italic": require("../../assets/fonts/RobotoCondensed-Italic.ttf"),

  // Inter
  "Inter-Light": require("../../assets/fonts/Inter_18pt-Light.ttf"),
  "Inter-Regular": require("../../assets/fonts/Inter_18pt-Regular.ttf"),
  "Inter-Medium": require("../../assets/fonts/Inter_18pt-Medium.ttf"),
  "Inter-SemiBold": require("../../assets/fonts/Inter_18pt-SemiBold.ttf"),
  "Inter-Bold": require("../../assets/fonts/Inter_18pt-Bold.ttf"),

  // Poppins
  "Poppins-Light": require("../../assets/fonts/Poppins-Light.ttf"),
  "Poppins-Regular": require("../../assets/fonts/Poppins-Regular.ttf"),
  "Poppins-Medium": require("../../assets/fonts/Poppins-Medium.ttf"),
  "Poppins-SemiBold": require("../../assets/fonts/Poppins-SemiBold.ttf"),
  "Poppins-Bold": require("../../assets/fonts/Poppins-Bold.ttf"),

  // Montserrat
  "Montserrat-Light": require("../../assets/fonts/Montserrat-Light.ttf"),
  "Montserrat-Regular": require("../../assets/fonts/Montserrat-Regular.ttf"),
  "Montserrat-Medium": require("../../assets/fonts/Montserrat-Medium.ttf"),
  "Montserrat-SemiBold": require("../../assets/fonts/Montserrat-SemiBold.ttf"),
  "Montserrat-Bold": require("../../assets/fonts/Montserrat-Bold.ttf"),

  // Outfit
  "Outfit-Light": require("../../assets/fonts/Outfit-Light.ttf"),
  "Outfit-Regular": require("../../assets/fonts/Outfit-Regular.ttf"),
  "Outfit-Medium": require("../../assets/fonts/Outfit-Medium.ttf"),
  "Outfit-SemiBold": require("../../assets/fonts/Outfit-SemiBold.ttf"),
  "Outfit-Bold": require("../../assets/fonts/Outfit-Bold.ttf"),

  // SpaceGrotesk
  "SpaceGrotesk-Regular": require("../../assets/fonts/SpaceGrotesk-Regular.ttf"),
  "SpaceGrotesk-Medium": require("../../assets/fonts/SpaceGrotesk-Medium.ttf"),
  "SpaceGrotesk-SemiBold": require("../../assets/fonts/SpaceGrotesk-SemiBold.ttf"),
  "SpaceGrotesk-Bold": require("../../assets/fonts/SpaceGrotesk-Bold.ttf"),
} as const;

export type FontKey = keyof typeof fonts;
