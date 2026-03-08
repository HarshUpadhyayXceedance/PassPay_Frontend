import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Confetti } from "./Confetti";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface TicketPurchaseSuccessProps {
  visible: boolean;
  mintAddress: string;
  eventName: string;
  onComplete?: () => void;
  duration?: number;
}

export function TicketPurchaseSuccess({
  visible,
  mintAddress,
  eventName,
  onComplete,
  duration = 3000,
}: TicketPurchaseSuccessProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);


      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();


      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.9,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onComplete?.();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onComplete]);

  if (!visible) return null;

  const shortenedMint = `${mintAddress.slice(0, 8)}...${mintAddress.slice(-8)}`;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <Confetti />
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            },
          ]}
        >

          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="ticket-outline" size={48} color={colors.primary} />
            </View>
            <View style={styles.checkmarkBadge}>
              <Ionicons name="checkmark" size={16} color={colors.text} />
            </View>
          </View>


          <Text style={styles.title}>Ticket Secured!</Text>


          <Text style={styles.eventName} numberOfLines={2}>
            {eventName}
          </Text>


          <View style={styles.mintContainer}>
            <Text style={styles.mintLabel}>NFT MINTED</Text>
            <Text style={styles.mintAddress}>{shortenedMint}</Text>
          </View>


          <Text style={styles.description}>
            Your NFT ticket has been added to My Passes
          </Text>


          <View style={styles.loadingContainer}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotDelay1]} />
            <View style={[styles.dot, styles.dotDelay2]} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    position: "relative",
    marginBottom: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.primary,
  },
  checkmarkBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.surface,
  },
  title: {
    fontSize: 26,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  eventName: {
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  mintContainer: {
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: "100%",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mintLabel: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 1,
  },
  mintAddress: {
    fontSize: 14,
    fontFamily: "monospace",
    color: colors.primary,
    textAlign: "center",
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    opacity: 0.4,
  },
  dotDelay1: {
    opacity: 0.6,
  },
  dotDelay2: {
    opacity: 0.8,
  },
});
