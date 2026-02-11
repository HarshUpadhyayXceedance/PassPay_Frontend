import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppHeader } from "../../components/ui/AppHeader";
import { QRScanner } from "../../components/qr/QRScanner";
import { AppCard } from "../../components/ui/AppCard";
import { AppButton } from "../../components/ui/AppButton";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { useScanner } from "../../hooks/useScanner";
import { apiCheckIn } from "../../services/api/eventApi";
import { TicketQRPayload } from "../../utils/qrPayload";
import { getAssociatedTokenAddress } from "../../solana/utils/tokenUtils";
import { PublicKey } from "@solana/web3.js";
import { shortenAddress } from "../../utils/formatters";
import { AdminStackParamList } from "../../types/navigation";

type Nav = NativeStackNavigationProp<AdminStackParamList, "CheckInScanner">;
type Route = RouteProp<AdminStackParamList, "CheckInScanner">;

export function CheckInScannerScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { handleScan, lastScan, error: scanError, reset } = useScanner();
  const [checkingIn, setCheckingIn] = useState(false);

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
        eventPda: route.params.eventKey,
        ticketMint: ticket.mint,
        holderTokenAccount: holderTokenAccount.toBase58(),
      });

      Alert.alert("Success", "Ticket checked in successfully!", [
        { text: "Scan Next", onPress: () => reset() },
      ]);
    } catch (error: any) {
      Alert.alert("Check-in Failed", error.message ?? "Unknown error");
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Check-in Scanner" onBack={() => navigation.goBack()} />

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
    color: colors.success,
    marginBottom: spacing.md,
  },
  ticketMint: {
    ...typography.caption,
    color: colors.text,
    fontFamily: "monospace",
    marginBottom: spacing.xs,
  },
  ticketOwner: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: "monospace",
  },
  actions: {
    gap: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
