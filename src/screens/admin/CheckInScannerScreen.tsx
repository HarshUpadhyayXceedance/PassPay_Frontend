import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { AppHeader } from "../../components/ui/AppHeader";
import { QRScanner } from "../../components/qr/QRScanner";
import { AppCard } from "../../components/ui/AppCard";
import { AppButton } from "../../components/ui/AppButton";
import { TierBadge } from "../../components/loyalty/TierBadge";
import { Confetti } from "../../components/animations/Confetti";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";
import { useScanner } from "../../hooks/useScanner";
import { apiCheckIn } from "../../services/api/eventApi";
import { apiIssueAttendanceBadge } from "../../solana/actions";
import { uploadMetadata } from "../../services/api/uploadApi";
import { TicketQRPayload } from "../../utils/qrPayload";
import { getAssociatedTokenAddress } from "../../solana/utils/tokenUtils";
import { PublicKey } from "@solana/web3.js";
import { shortenAddress } from "../../utils/formatters";
import { BadgeTier, TIER_NAMES } from "../../types/loyalty";

export function CheckInScannerScreen() {
  const router = useRouter();
  const { eventKey } = useLocalSearchParams<{ eventKey: string }>();
  const { handleScan, lastScan, error: scanError, reset } = useScanner();
  const [checkingIn, setCheckingIn] = useState(false);
  const [issuingBadge, setIssuingBadge] = useState(false);
  const [badgeIssued, setBadgeIssued] = useState(false);
  const [newBadgeTier, setNewBadgeTier] = useState<BadgeTier | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const ticket =
    lastScan?.type === "ticket" ? (lastScan as TicketQRPayload) : null;

  const handleCheckIn = async () => {
    if (!ticket) return;

    setCheckingIn(true);
    try {
      const holderTokenAccount = getAssociatedTokenAddress(
        new PublicKey(ticket.mint),
        new PublicKey(ticket.owner)
      );

      await apiCheckIn({
        eventPda: eventKey as string,
        ticketMint: ticket.mint,
        holderTokenAccount: holderTokenAccount.toBase58(),
      });

      // Prompt for badge issuance
      Alert.alert(
        "Check-in Successful",
        "Would you like to issue an attendance badge to this user?",
        [
          {
            text: "Issue Badge",
            onPress: () => handleIssueBadge(),
          },
          {
            text: "Skip",
            onPress: () => {
              reset();
              setBadgeIssued(false);
              setNewBadgeTier(null);
              setShowConfetti(false);
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Check-in Failed", error.message ?? "Unknown error");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleIssueBadge = async () => {
    if (!ticket) return;

    setIssuingBadge(true);
    try {
      const metadataUri = await uploadMetadata({
        name: "PassPay Attendance Badge",
        symbol: "BADGE",
        description: "Attendance badge for event check-in via PassPay",
        image: "",
        attributes: [
          { trait_type: "Type", value: "Attendance Badge" },
          { trait_type: "Event", value: eventKey as string },
        ],
      });
      const result = await apiIssueAttendanceBadge({
        eventPda: eventKey as string,
        attendee: ticket.owner,
        metadataUri,
      });

      // For demo, assume Bronze tier (tier 1)
      setNewBadgeTier(BadgeTier.Bronze);
      setBadgeIssued(true);
      setShowConfetti(true);

      // Haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        "Badge Issued!",
        `Attendance badge has been minted for ${shortenAddress(ticket.owner, 4)}`,
        [
          {
            text: "Scan Next",
            onPress: () => {
              reset();
              setBadgeIssued(false);
              setNewBadgeTier(null);
              setShowConfetti(false);
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Badge Issue Failed", error.message ?? "Unknown error");
    } finally {
      setIssuingBadge(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Check-in Scanner" onBack={() => router.back()} />

      <View style={styles.content}>
        {!ticket ? (
          <QRScanner
            onScan={(data) => handleScan(data)}
            title="Scan Attendee Ticket"
          />
        ) : (
          <View style={styles.ticketView}>
            <AppCard style={styles.ticketCard}>
              <Text style={styles.ticketTitle}>
                {badgeIssued ? "Badge Issued!" : "Ticket Found"}
              </Text>

              {badgeIssued && newBadgeTier !== null ? (
                <View style={styles.badgePreview}>
                  <LinearGradient
                    colors={["#6C5CE7", "#00CEC9"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.badgeGlow}
                  >
                    <TierBadge tier={newBadgeTier} size="large" showLabel />
                  </LinearGradient>
                  <Text style={styles.badgeMessage}>
                    {TIER_NAMES[newBadgeTier]} Badge Earned!
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.ticketMint}>
                    Mint: {shortenAddress(ticket.mint, 6)}
                  </Text>
                  <Text style={styles.ticketOwner}>
                    Owner: {shortenAddress(ticket.owner, 6)}
                  </Text>
                </>
              )}
            </AppCard>

            {!badgeIssued && (
              <View style={styles.actions}>
                <AppButton
                  title="Check In"
                  onPress={handleCheckIn}
                  loading={checkingIn}
                  size="lg"
                />
                <AppButton
                  title="Cancel"
                  onPress={() => reset()}
                  variant="outline"
                />
              </View>
            )}

            {badgeIssued && (
              <View style={styles.actions}>
                <AppButton
                  title="Scan Next"
                  onPress={() => {
                    reset();
                    setBadgeIssued(false);
                    setNewBadgeTier(null);
                    setShowConfetti(false);
                  }}
                  size="lg"
                />
              </View>
            )}
          </View>
        )}

        {scanError && <Text style={styles.errorText}>{scanError}</Text>}
      </View>

      {showConfetti && (
        <Confetti
          count={60}
          duration={3000}
          onComplete={() => setShowConfetti(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  ticketView: {
    flex: 1,
    justifyContent: "center",
  },
  ticketCard: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  ticketTitle: {
    ...typography.h3,
    fontFamily: fonts.heading,
    color: colors.success,
    marginBottom: spacing.md,
  },
  ticketMint: {
    ...typography.caption,
    fontFamily: fonts.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ticketOwner: {
    ...typography.caption,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  badgePreview: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  badgeGlow: {
    padding: spacing.lg,
    borderRadius: 100,
    marginBottom: spacing.md,
  },
  badgeMessage: {
    fontSize: 18,
    fontFamily: fonts.headingSemiBold,
    color: colors.primary,
    textAlign: "center",
  },
  actions: {
    gap: spacing.md,
  },
  errorText: {
    ...typography.caption,
    fontFamily: fonts.body,
    color: colors.error,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
