import React from "react";
import { View, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { borderRadius } from "../../theme/spacing";

interface QRGeneratorProps {
  value: string;
  size?: number;
}

export function QRGenerator({ value, size = 200 }: QRGeneratorProps) {
  return (
    <View style={styles.container}>
      <QRCode
        value={value}
        size={size}
        backgroundColor={colors.white}
        color={colors.black}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    alignSelf: "center",
  },
});
