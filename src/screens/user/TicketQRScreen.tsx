import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import { useTickets } from "../../hooks/useTickets";
import { formatDate } from "../../utils/formatters";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const QR_SIZE = Math.min(SCREEN_WIDTH * 0.7, 300);

export function TicketQRScreen() {
  const router = useRouter();
  const { ticketKey } = useLocalSearchParams<{ ticketKey: string }>();
  const { tickets } = useTickets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const ticket = tickets.find((t) => t.publicKey === ticketKey);

  useEffect(() => {
    // Success haptic on load
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous pulse animation for border
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => {
      pulse.stop();
    };
  }, []);

  if (!ticket) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <Text style={styles.backIcon}>×</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Ticket not found</Text>
        </View>
      </View>
    );
  }

  // Create QR payload (matches TicketQRPayload interface)
  const qrPayload = JSON.stringify({
    type: "ticket",
    mint: ticket.mint,
    owner: ticket.owner,
    event: ticket.eventKey,
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Text style={styles.backIcon}>×</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ticket QR Code</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Status Badge */}
        {ticket.isCheckedIn ? (
          <View style={[styles.statusBadge, styles.usedBadge]}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>ALREADY CHECKED IN</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, styles.validBadge]}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>READY TO SCAN</Text>
          </View>
        )}

        {/* QR Code Container with Animated Border */}
        <Animated.View
          style={[
            styles.qrContainer,
            ticket.isCheckedIn ? styles.qrContainerUsed : styles.qrContainerValid,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View style={styles.qrInner}>
            <QRCode
              value={qrPayload}
              size={QR_SIZE}
              backgroundColor={colors.text}
              color={colors.background}
              quietZone={0}
            />
          </View>
        </Animated.View>

        {/* Ticket Information */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>EVENT</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {ticket.eventName}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>SEAT</Text>
            <Text style={[styles.infoValue, styles.seatValue]}>
              #{ticket.seatNumber}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>DATE</Text>
            <Text style={styles.infoValue}>{formatDate(ticket.eventDate)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>VENUE</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {ticket.eventVenue}
            </Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          {ticket.isCheckedIn ? (
            <>
              <Text style={styles.instructionsIcon}>✓</Text>
              <Text style={styles.instructionsText}>
                This ticket has already been checked in
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.instructionsIcon}>📱</Text>
              <Text style={styles.instructionsText}>
                Present this QR code to staff at the venue entrance
              </Text>
            </>
          )}
        </View>

        {/* NFT Badge */}
        <View style={styles.nftBadge}>
          <Text style={styles.nftBadgeText}>VERIFIED NFT TICKET</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    fontSize: 28,
    color: colors.text,
    fontWeight: "300",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
  },
  headerSpacer: {
    width: 44,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },

  /* ---- Content ---- */
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  /* ---- Status Badge ---- */
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 32,
    gap: 8,
  },
  validBadge: {
    backgroundColor: "rgba(0,206,201,0.15)",
  },
  usedBadge: {
    backgroundColor: "rgba(143,149,178,0.15)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.secondary,
    letterSpacing: 1,
    fontFamily: fonts.bodyBold,
  },

  /* ---- QR Code ---- */
  qrContainer: {
    padding: 8,
    borderRadius: 24,
    borderWidth: 4,
    marginBottom: 32,
  },
  qrContainerValid: {
    borderColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  qrContainerUsed: {
    borderColor: colors.textMuted,
    opacity: 0.6,
  },
  qrInner: {
    backgroundColor: colors.text,
    padding: 16,
    borderRadius: 18,
  },

  /* ---- Info Section ---- */
  infoSection: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 24,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: fonts.bodySemiBold,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
    fontFamily: fonts.bodyMedium,
  },
  seatValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
    fontFamily: fonts.heading,
  },

  /* ---- Instructions ---- */
  instructionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  instructionsIcon: {
    fontSize: 24,
  },
  instructionsText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
    lineHeight: 18,
    fontFamily: fonts.body,
  },

  /* ---- NFT Badge ---- */
  nftBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  nftBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 1.5,
    fontFamily: fonts.bodyBold,
  },
});
