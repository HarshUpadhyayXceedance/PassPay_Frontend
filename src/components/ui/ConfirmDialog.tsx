import React from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing, borderRadius } from "../../theme/spacing";

type IoniconsName = keyof typeof Ionicons.glyphMap;

export type ConfirmDialogType = "default" | "danger" | "success" | "info";

export interface ConfirmDialogButton {
  text: string;
  onPress: () => void;
  style?: "default" | "cancel" | "destructive";
}

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  type?: ConfirmDialogType;
  icon?: IoniconsName;
  buttons: ConfirmDialogButton[];
}

interface ConfirmDialogProps {
  visible: boolean;
  config: ConfirmDialogConfig | null;
  onDismiss: () => void;
}

const TYPE_COLORS: Record<ConfirmDialogType, string> = {
  default: colors.primary,
  danger: colors.error,
  success: colors.success,
  info: colors.secondary,
};

const TYPE_ICONS: Record<ConfirmDialogType, IoniconsName> = {
  default: "help-circle-outline",
  danger: "warning-outline",
  success: "checkmark-circle-outline",
  info: "information-circle-outline",
};

export function ConfirmDialog({ visible, config, onDismiss }: ConfirmDialogProps) {
  if (!config) return null;

  const type = config.type ?? "default";
  const typeColor = TYPE_COLORS[type];
  const icon = config.icon ?? TYPE_ICONS[type];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.dialog}>

              <LinearGradient
                colors={[typeColor, typeColor + "66"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.accentLine}
              />


              <View style={[styles.iconCircle, { backgroundColor: typeColor + "1A" }]}>
                <Ionicons name={icon} size={32} color={typeColor} />
              </View>


              <Text style={styles.title}>{config.title}</Text>


              <Text style={styles.message}>{config.message}</Text>


              <View style={styles.buttonRow}>
                {config.buttons.map((btn, idx) => {
                  const isCancel = btn.style === "cancel";
                  const isDestructive = btn.style === "destructive";
                  const isPrimary = !isCancel && idx === config.buttons.length - 1;

                  if (isCancel) {
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={styles.cancelButton}
                        onPress={() => { btn.onPress(); onDismiss(); }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cancelButtonText}>{btn.text}</Text>
                      </TouchableOpacity>
                    );
                  }

                  const btnColor = isDestructive ? colors.error : typeColor;

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.primaryButton,
                        { backgroundColor: btnColor },
                        isDestructive && styles.destructiveButton,
                      ]}
                      onPress={() => { btn.onPress(); onDismiss(); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.primaryButtonText,
                        isDestructive && styles.destructiveButtonText,
                      ]}>
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  dialog: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  accentLine: {
    width: "100%",
    height: 3,
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  buttonRow: {
    width: "100%",
    gap: spacing.sm,
  },
  cancelButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
  },
  primaryButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: fonts.heading,
    color: colors.background,
  },
  destructiveButton: {
    backgroundColor: colors.error,
  },
  destructiveButtonText: {
    color: colors.white,
  },
});
