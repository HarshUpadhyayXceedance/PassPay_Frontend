import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Connection, PublicKey } from "@solana/web3.js";
import { AppHeader } from "../../components/ui/AppHeader";
import { QRScanner } from "../../components/qr/QRScanner";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing, borderRadius } from "../../theme/spacing";
import { formatSOL, shortenAddress } from "../../utils/formatters";
import { useWallet } from "../../hooks/useWallet";
import { showWarning, showError, showSuccess } from "../../utils/alerts";
import { apiCollectProduct } from "../../services/api/eventApi";
import { DEVNET_RPC } from "../../solana/config/constants";

interface DeliveryPayload {
  type: "delivery";
  purchaseRecord: string;
  productName: string;
  buyer: string;
  merchant: string;
  eventPda: string;
  amount: number;
  timestamp: number;
}

async function checkOnChainCollected(purchaseRecord: string): Promise<boolean> {
  try {
    const connection = new Connection(DEVNET_RPC, "confirmed");
    const info = await connection.getAccountInfo(new PublicKey(purchaseRecord));
    if (!info || info.data.length < 130) return false;

    return info.data[112] !== 0;
  } catch {
    return false;
  }
}

export function VerifyPurchaseScreen() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const [result, setResult] = useState<DeliveryPayload | null>(null);
  const [verified, setVerified] = useState(false);
  const [isAlreadyUsed, setIsAlreadyUsed] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);


  useFocusEffect(
    useCallback(() => {
      setResult(null);
      setVerified(false);
      setIsAlreadyUsed(false);
      setIsCollecting(false);
    }, [])
  );

  const handleScan = useCallback(async (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.type !== "delivery" || !parsed.purchaseRecord) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showError("Invalid QR", "This QR code is not a purchase receipt.");
        return;
      }


      const alreadyCollected = await checkOnChainCollected(parsed.purchaseRecord);
      if (alreadyCollected) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setIsAlreadyUsed(true);
        setResult(parsed as DeliveryPayload);
        showWarning(
          "Already Collected",
          "This purchase has already been marked as collected."
        );
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsAlreadyUsed(false);
      setResult(parsed as DeliveryPayload);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showError("Invalid QR", "Could not read QR code data.");
    }
  }, []);

  const handleConfirmDelivery = useCallback(async () => {
    if (!result) return;

    setIsCollecting(true);
    try {
      await apiCollectProduct({
        eventPda: result.eventPda,
        merchantAuthority: result.merchant,
        productName: result.productName,
        purchaseRecord: result.purchaseRecord,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccess("Collected", "Product marked as collected on-chain.");
      setVerified(true);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = error.message ?? "Something went wrong";
      if (msg.includes("ProductAlreadyCollected") || msg.includes("already been collected")) {
        setIsAlreadyUsed(true);
        showWarning("Already Collected", "This purchase was already collected.");
      } else {
        showError("Collection Failed", msg);
      }
    } finally {
      setIsCollecting(false);
    }
  }, [result]);

  const handleReset = useCallback(() => {
    setResult(null);
    setVerified(false);
    setIsAlreadyUsed(false);
    setIsCollecting(false);
  }, []);

  const dateStr = result
    ? new Date(result.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <View style={styles.container}>
      <AppHeader title="Verify Purchase" onBack={() => router.back()} />

      <View style={styles.content}>
        {!result ? (
          <View style={styles.scannerSection}>
            <View style={styles.instructionCard}>
              <Ionicons name="scan-outline" size={24} color={colors.primary} />
              <Text style={styles.instructionText}>
                Scan the customer's purchase receipt QR code to verify their order
              </Text>
            </View>
            <QRScanner onScan={handleScan} title="Scan Receipt QR" />
          </View>
        ) : verified ? (
          <View style={styles.verifiedContainer}>
            <View style={styles.verifiedIconWrap}>
              <Ionicons name="checkmark-circle" size={72} color={colors.success} />
            </View>
            <Text style={styles.verifiedTitle}>Delivery Confirmed</Text>
            <Text style={styles.verifiedSubtitle}>
              Item has been marked as collected on-chain
            </Text>

            <View style={styles.detailCard}>
              <DetailRow label="Product" value={result.productName} />
              <DetailRow label="Amount" value={`${formatSOL(result.amount)} SOL`} accent />
              <DetailRow label="Customer" value={shortenAddress(result.buyer, 6)} />
              <DetailRow label="Date" value={dateStr} />
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <Ionicons name="scan-outline" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        ) : isAlreadyUsed ? (
          <View style={styles.usedContainer}>
            <View style={styles.usedIconWrap}>
              <Ionicons name="close-circle" size={72} color={colors.error} />
            </View>
            <Text style={styles.usedTitle}>Already Collected</Text>
            <Text style={styles.usedSubtitle}>
              This purchase has already been collected
            </Text>

            <View style={styles.detailCard}>
              <DetailRow label="Product" value={result.productName} />
              <DetailRow label="Amount" value={`${formatSOL(result.amount)} SOL`} />
              <DetailRow label="Customer" value={shortenAddress(result.buyer, 6)} />
              <DetailRow label="Date" value={dateStr} />
              <View style={styles.statusBadge}>
                <Ionicons name="ban" size={16} color={colors.error} />
                <Text style={styles.statusBadgeText}>COLLECTED</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <Ionicons name="scan-outline" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resultContainer}>
            <View style={styles.resultHeader}>
              <View style={styles.resultIconWrap}>
                <Ionicons name="receipt" size={32} color={colors.secondary} />
              </View>
              <Text style={styles.resultTitle}>Purchase Found</Text>
              <Text style={styles.resultSubtitle}>
                Verify the details and confirm delivery
              </Text>
              <View style={styles.statusBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.statusBadgeText, { color: colors.success }]}>VALID</Text>
              </View>
            </View>

            <View style={styles.detailCard}>
              <DetailRow label="Product" value={result.productName} />
              <DetailRow label="Amount" value={`${formatSOL(result.amount)} SOL`} accent />
              <DetailRow label="Customer" value={shortenAddress(result.buyer, 6)} />
              <DetailRow label="Date" value={dateStr} />
              <DetailRow
                label="Record"
                value={shortenAddress(result.purchaseRecord, 6)}
              />
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.primaryButton, isCollecting && styles.buttonDisabled]}
                onPress={handleConfirmDelivery}
                disabled={isCollecting}
                activeOpacity={0.8}
              >
                {isCollecting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}>Confirm Delivery</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={handleReset}
                activeOpacity={0.7}
                disabled={isCollecting}
              >
                <Text style={styles.outlineButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function DetailRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={[detailStyles.value, accent && detailStyles.valueAccent]}>
        {value}
      </Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  value: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
    maxWidth: "60%",
    textAlign: "right",
  },
  valueAccent: {
    fontFamily: fonts.heading,
    color: colors.secondary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  scannerSection: {
    flex: 1,
  },
  instructionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryMuted,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Result view
  resultContainer: {
    flex: 1,
    paddingTop: spacing.xl,
  },
  resultHeader: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  resultIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.secondaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  resultTitle: {
    fontSize: 22,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  resultSubtitle: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 4,
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: "#fff",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  outlineButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlineButtonText: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
  },

  // Verified view
  verifiedContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: spacing.xxl,
  },
  verifiedIconWrap: {
    marginBottom: spacing.md,
  },
  verifiedTitle: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: colors.success,
    marginBottom: 4,
  },
  verifiedSubtitle: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: "center",
  },

  // Used view
  usedContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: spacing.xxl,
  },
  usedIconWrap: {
    marginBottom: spacing.md,
  },
  usedTitle: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: colors.error,
    marginBottom: 4,
  },
  usedSubtitle: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: "center",
  },

  // Status badge
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.error,
    letterSpacing: 1,
  },
});
