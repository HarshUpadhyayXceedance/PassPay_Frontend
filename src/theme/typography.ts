import { TextStyle } from "react-native";
import { fonts } from "./fonts";

export const typography: Record<string, TextStyle> = {
  display: {
    fontSize: 36,
    fontFamily: fonts.displayBold,
    lineHeight: 44,
  },
  displaySm: {
    fontSize: 28,
    fontFamily: fonts.displayRegular,
    lineHeight: 36,
  },

  h1: {
    fontSize: 32,
    fontFamily: fonts.heading,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontFamily: fonts.heading,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontFamily: fonts.headingSemiBold,
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontFamily: fonts.headingSemiBold,
    lineHeight: 24,
  },

  body: {
    fontSize: 16,
    fontFamily: fonts.body,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    lineHeight: 24,
  },
  bodySm: {
    fontSize: 14,
    fontFamily: fonts.body,
    lineHeight: 20,
  },

  caption: {
    fontSize: 14,
    fontFamily: fonts.caption,
    lineHeight: 20,
  },
  captionMedium: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontFamily: fonts.body,
    lineHeight: 16,
  },
  smallBold: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    lineHeight: 16,
  },

  button: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  buttonSm: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    lineHeight: 20,
    letterSpacing: 0.3,
  },

  price: {
    fontSize: 24,
    fontFamily: fonts.heading,
    lineHeight: 32,
  },
  priceSm: {
    fontSize: 18,
    fontFamily: fonts.headingSemiBold,
    lineHeight: 24,
  },

  label: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    lineHeight: 18,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  tag: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
};
