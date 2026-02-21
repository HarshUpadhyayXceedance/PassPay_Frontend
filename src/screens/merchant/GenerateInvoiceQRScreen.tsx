import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { AppInput } from "../../components/ui/AppInput";
import { AppButton } from "../../components/ui/AppButton";
import { QRPreview } from "../../components/qr/QRPreview";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { useWalletStore } from "../../store/walletStore";
import { useMerchants } from "../../hooks/useMerchants";
import { encodeQRPayload } from "../../utils/qrPayload";
import { validateAmount } from "../../utils/validators";

export function GenerateInvoiceQRScreen() {
  const publicKey = useWalletStore((s) => s.publicKey);
  const { merchants, fetchMerchants } = useMerchants();

  useEffect(() => {
    fetchMerchants();
  }, []);
  const [amount, setAmount] = useState("");
  const [qrData, setQrData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const myMerchant = merchants.find((m) => m.authority === publicKey);

  const handleGenerate = () => {
    const err = validateAmount(amount);
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    if (!myMerchant || !publicKey) {
      setError("Merchant not found");
      return;
    }

    const payload = encodeQRPayload({
      type: "payment",
      merchantAuthority: publicKey,
      eventKey: myMerchant.eventKey,
      amount: parseFloat(amount),
    });

    setQrData(payload);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Generate Payment QR</Text>

      {!myMerchant ? (
        <Text style={styles.emptyText}>
          You are not registered as a merchant for any event.
        </Text>
      ) : (
        <>
          <Text style={styles.merchantName}>{myMerchant.name}</Text>

          <AppInput
            label="Amount (SOL)"
            value={amount}
            onChangeText={(text) => {
              setAmount(text);
              setQrData(null);
            }}
            placeholder="0.05"
            keyboardType="decimal-pad"
            error={error ?? undefined}
          />

          <AppButton
            title="Generate QR"
            onPress={handleGenerate}
            style={styles.generateButton}
          />

          {qrData && (
            <View style={styles.qrContainer}>
              <QRPreview
                data={qrData}
                title={`${amount} SOL`}
                subtitle="Show this to the customer"
                size={220}
              />
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  merchantName: {
    ...typography.bodyBold,
    color: colors.secondary,
    marginBottom: spacing.lg,
  },
  generateButton: {
    marginTop: spacing.sm,
  },
  qrContainer: {
    marginTop: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xxl,
  },
});
