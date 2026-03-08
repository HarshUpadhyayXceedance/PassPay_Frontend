import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { AppHeader } from "../../components/ui/AppHeader";
import { QRScanner } from "../../components/qr/QRScanner";
import { AppCard } from "../../components/ui/AppCard";
import { AppButton } from "../../components/ui/AppButton";
import { Confetti } from "../../components/animations/Confetti";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";
import { useScanner } from "../../hooks/useScanner";
import { apiCheckIn } from "../../services/api/eventApi";
import { TicketQRPayload } from "../../utils/qrPayload";
import { getAssociatedTokenAddress } from "../../solana/utils/tokenUtils";
import { PublicKey } from "@solana/web3.js";
import { shortenAddress } from "../../utils/formatters";
import { showSuccess, showWarning, showError } from "../../utils/alerts";
import { confirm } from "../../components/ui/ConfirmDialogProvider";

export function CheckInScannerScreen() {
  const router = useRouter();
  const { eventKey } = useLocalSearchParams<{ eventKey: string }>();
  const { handleScan, lastScan, error: scanError, reset } = useScanner();
  const [checkingIn, setCheckingIn] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const ticket =
    lastScan?.type === "ticket" ? (lastScan as TicketQRPayload) : null;

  const resolvedEventKey = eventKey || ticket?.event;

  const handleCheckIn = async () => {
    if (!ticket) return;

    if (!ticket.mint || !ticket.owner) {
      showWarning("Invalid Ticket QR", "This QR code is missing required data. Please ask the attendee to regenerate their QR code.");
      return;
    }

    if (!resolvedEventKey) {
      showError("Error", "No event found. The ticket QR is missing event data.");
      return;
    }

    setCheckingIn(true);
    try {
      const mintPubkey = new PublicKey(ticket.mint);
      const ownerPubkey = new PublicKey(ticket.owner);
      const holderTokenAccount = getAssociatedTokenAddress(
        mintPubkey,
        ownerPubkey
      );

      await apiCheckIn({
        eventPda: resolvedEventKey,
        ticketMint: ticket.mint,
        holderTokenAccount: holderTokenAccount.toBase58(),
        ticketHolder: ticket.owner,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowConfetti(true);

      confirm({
        title: "Check-in Successful!",
        message: `Attendee ${shortenAddress(ticket.owner, 4)} has been checked in. Attendance and loyalty tier updated on-chain.`,
        type: "success",
        buttons: [
          {
            text: "Scan Next",
            style: "default",
            onPress: () => {
              reset();
              setShowConfetti(false);
            },
          },
        ],
      });
    } catch (error: any) {
      showError("Check-in Failed", error.message ?? "Unknown error");
    } finally {
      setCheckingIn(false);
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
              <Text style={styles.ticketTitle}>Ticket Found</Text>
              <Text style={styles.ticketMint}>
                Mint: {shortenAddress(ticket.mint, 6)}
              </Text>
              <Text style={styles.ticketOwner}>
                Owner: {shortenAddress(ticket.owner, 6)}
              </Text>
            </AppCard>

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
