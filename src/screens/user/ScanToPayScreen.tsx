import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { AppHeader } from "../../components/ui/AppHeader";
import { AppButton } from "../../components/ui/AppButton";
import { QRScanner } from "../../components/qr/QRScanner";
import { AppCard } from "../../components/ui/AppCard";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";
import { useScanner } from "../../hooks/useScanner";
import { useWallet } from "../../hooks/useWallet";
import { useLoyalty } from "../../hooks/useLoyalty";
import { apiPayMerchant } from "../../services/api/merchantApi";
import { PaymentQRPayload } from "../../utils/qrPayload";
import { formatSOL } from "../../utils/formatters";
import { showSuccess, showError } from "../../utils/alerts";
import { useTickets } from "../../hooks/useTickets";
import { usePurchaseStore } from "../../store/purchaseStore";
import { DiscountPill } from "../../components/loyalty/DiscountPill";

export function ScanToPayScreen() {
  const router = useRouter();
  const { handleScan, lastScan, error: scanError, reset } = useScanner();
  const { refreshBalance } = useWallet();
  const { loyaltyBenefits, fetchLoyaltyBenefits } = useLoyalty();
  const { tickets } = useTickets();
  const { publicKey } = useWallet();
  const addPurchase = usePurchaseStore((s) => s.addPurchase);
  const [paying, setPaying] = useState(false);

  const payment = lastScan?.type === "payment" ? (lastScan as PaymentQRPayload) : null;

  useEffect(() => {
    fetchLoyaltyBenefits();
  }, []);

  // Calculate merchant discount
  const baseAmount = payment?.amount || 0;
  const merchantDiscount = loyaltyBenefits?.merchantDiscount || 0;
  const discountAmount = baseAmount * (merchantDiscount / 100);
  const finalAmount = baseAmount - discountAmount;

  const handlePay = async () => {
    if (!payment) return;

    const myTicket = tickets.find((t) => t.eventKey === payment.eventKey);
    if (!myTicket) {
      showError("Error", "You don't have a ticket for this event");
      return;
    }

    setPaying(true);
    try {
      const txSig = await apiPayMerchant({
        eventPda: payment.eventKey,
        merchantAuthority: payment.merchantAuthority,
        amount: finalAmount,
      });
      await refreshBalance();

      // Save purchase receipt for ShopScreen
      addPurchase({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        productName: payment.productName ?? "Payment",
        merchantName: payment.merchantAuthority,
        merchantAuthority: payment.merchantAuthority,
        eventKey: payment.eventKey,
        amount: finalAmount,
        buyer: publicKey ?? "",
        timestamp: Date.now(),
        txSignature: typeof txSig === "string" ? txSig : undefined,
      });

      showSuccess("Success", `Paid ${formatSOL(finalAmount)} SOL`);
      reset();
      router.back();
    } catch (error: any) {
      showError("Error", error.message ?? "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Scan to Pay" onBack={() => router.back()} />

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

              {merchantDiscount > 0 && (
                <View style={styles.discountBadge}>
                  <DiscountPill
                    percentage={merchantDiscount}
                    tier={loyaltyBenefits?.currentTier || 0}
                  />
                </View>
              )}

              {merchantDiscount > 0 && (
                <View style={styles.priceBreakdown}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Base Amount</Text>
                    <Text style={styles.priceStrikethrough}>
                      {formatSOL(baseAmount)} SOL
                    </Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Loyalty Discount</Text>
                    <Text style={styles.priceDiscount}>
                      -{formatSOL(discountAmount)} SOL
                    </Text>
                  </View>
                  <View style={styles.priceDivider} />
                </View>
              )}

              <Text style={styles.amount}>
                {formatSOL(finalAmount)} SOL
              </Text>

              {merchantDiscount > 0 && (
                <Text style={styles.savingsText}>
                  You save {formatSOL(discountAmount)} SOL!
                </Text>
              )}
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
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  discountBadge: {
    marginBottom: spacing.sm,
  },
  priceBreakdown: {
    width: "100%",
    marginBottom: spacing.md,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  priceLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  priceStrikethrough: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.textMuted,
    textDecorationLine: "line-through",
  },
  priceDiscount: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.primary,
  },
  priceDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  amount: {
    fontSize: 40,
    fontFamily: fonts.displayBold,
    color: colors.primary,
  },
  savingsText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
    marginTop: spacing.xs,
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
