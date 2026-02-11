import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppHeader } from "../../components/ui/AppHeader";
import { AppButton } from "../../components/ui/AppButton";
import { QRScanner } from "../../components/qr/QRScanner";
import { AppCard } from "../../components/ui/AppCard";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { useScanner } from "../../hooks/useScanner";
import { useWallet } from "../../hooks/useWallet";
import { apiPayMerchant } from "../../services/api/merchantApi";
import { PaymentQRPayload } from "../../utils/qrPayload";
import { formatSOL } from "../../utils/formatters";
import { UserStackParamList } from "../../types/navigation";
import { useTickets } from "../../hooks/useTickets";

type Nav = NativeStackNavigationProp<UserStackParamList, "ScanToPay">;

export function ScanToPayScreen() {
  const navigation = useNavigation<Nav>();
  const { handleScan, lastScan, error: scanError, reset } = useScanner();
  const { refreshBalance } = useWallet();
  const { tickets } = useTickets();
  const [paying, setPaying] = useState(false);

  const payment = lastScan?.type === "payment" ? (lastScan as PaymentQRPayload) : null;

  const handlePay = async () => {
    if (!payment) return;

    const myTicket = tickets.find((t) => t.eventKey === payment.eventKey);
    if (!myTicket) {
      Alert.alert("Error", "You don't have a ticket for this event");
      return;
    }

    setPaying(true);
    try {
      await apiPayMerchant({
        eventPda: payment.eventKey,
        merchantAuthority: payment.merchantAuthority,
        ticketMint: myTicket.mint,
        amount: payment.amount,
      });
      await refreshBalance();
      Alert.alert("Success", `Paid ${formatSOL(payment.amount)} SOL`, [
        { text: "Done", onPress: () => { reset(); navigation.goBack(); } },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Scan to Pay" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        {!payment ? (
          <QRScanner
            onScan={(data) => handleScan(data)}
            title="Scan Merchant QR"
          />
        ) : (
          <View style={styles.paymentView}>
            <AppCard style={styles.paymentCard}>
              <Text style={styles.paymentTitle}>Payment Request</Text>
              <Text style={styles.amount}>
                {formatSOL(payment.amount)} SOL
              </Text>
            </AppCard>

            <View style={styles.actions}>
              <AppButton
                title="Pay Now"
                onPress={handlePay}
                loading={paying}
                size="lg"
              />
              <AppButton
                title="Cancel"
                onPress={() => reset()}
                variant="outline"
                size="lg"
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
  paymentView: {
    flex: 1,
    justifyContent: "center",
  },
  paymentCard: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  paymentTitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  amount: {
    fontSize: 40,
    fontWeight: "700",
    color: colors.primary,
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
