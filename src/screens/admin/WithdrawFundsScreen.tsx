import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing, borderRadius } from "../../theme/spacing";
import { useEvents } from "../../hooks/useEvents";
import { useWallet } from "../../hooks/useWallet";
import { apiWithdrawFunds } from "../../services/api/eventApi";
import { formatSOL, shortenAddress } from "../../utils/formatters";

const MOCK_SOL_TO_USD = 150;
const NETWORK_FEE_SOL = 0.000005;

export function WithdrawFundsScreen() {
  const router = useRouter();
  const { eventKey } = useLocalSearchParams<{ eventKey: string }>();
  const { getEvent } = useEvents();
  const { publicKey } = useWallet();

  const [amount, setAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const event = eventKey ? getEvent(eventKey) : undefined;

  const totalRevenue = useMemo(() => {
    if (!event) return 0;
    return event.ticketsSold * event.currentTicketPrice;
  }, [event]);

  // Available balance is the total revenue collected in the event PDA.
  // In a real implementation this would come from the on-chain account balance,
  // but we derive it from ticket sales here for display purposes.
  const availableBalance = totalRevenue;

  const parsedAmount = parseFloat(amount) || 0;
  const usdEquivalent = parsedAmount * MOCK_SOL_TO_USD;

  const handleMax = () => {
    setAmount(availableBalance > 0 ? availableBalance.toFixed(9).replace(/\.?0+$/, "") : "0");
  };

  const validate = (): string | null => {
    if (!publicKey) return "Wallet not connected";
    if (!event) return "Event not found";
    if (parsedAmount <= 0) return "Enter an amount greater than 0";
    if (parsedAmount > availableBalance) return "Amount exceeds available balance";
    return null;
  };

  const handleWithdraw = async () => {
    const error = validate();
    if (error) {
      Alert.alert("Invalid", error);
      return;
    }

    Alert.alert(
      "Confirm Withdrawal",
      `Withdraw ${formatSOL(parsedAmount)} SOL (~$${usdEquivalent.toFixed(2)}) to your wallet?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setIsWithdrawing(true);
            try {
              const signature = await apiWithdrawFunds({
                eventPda: eventKey!,
                amount: parsedAmount,
              });

              Alert.alert(
                "Withdrawal Successful",
                `${formatSOL(parsedAmount)} SOL has been sent to your wallet.\n\nSignature: ${signature.slice(0, 16)}...`,
                [{ text: "OK", onPress: () => router.back() }]
              );
            } catch (err: any) {
              Alert.alert("Withdrawal Failed", err.message || "An unexpected error occurred");
            } finally {
              setIsWithdrawing(false);
            }
          },
        },
      ]
    );
  };

  if (!event) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Withdraw Funds</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>Event not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw Funds</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Event Summary Card with Gradient Accent */}
          <LinearGradient
            colors={colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCardGradient}
          >
            <View style={styles.balanceCardInner}>
              <Text style={styles.eventName}>{event.name}</Text>

              <View style={styles.balanceRow}>
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceLabel}>Total Revenue</Text>
                  <Text style={styles.balanceValue}>
                    {formatSOL(totalRevenue)} SOL
                  </Text>
                </View>
                <View style={styles.balanceDivider} />
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceLabel}>Available</Text>
                  <Text style={[styles.balanceValue, styles.balanceHighlight]}>
                    {formatSOL(availableBalance)} SOL
                  </Text>
                </View>
              </View>

              <View style={styles.ticketsSummary}>
                <Ionicons name="ticket-outline" size={16} color={colors.primaryLight} />
                <Text style={styles.ticketsSummaryText}>
                  {event.ticketsSold} / {event.totalSeats} tickets sold
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Amount Input Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Withdrawal Amount</Text>

            <View style={styles.amountInputContainer}>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                returnKeyType="done"
                editable={!isWithdrawing}
              />
              <Text style={styles.amountSuffix}>SOL</Text>
            </View>

            <View style={styles.amountMeta}>
              <Text style={styles.usdEquivalent}>
                ~${usdEquivalent.toFixed(2)} USD
              </Text>
              <TouchableOpacity onPress={handleMax} style={styles.maxButton}>
                <Text style={styles.maxButtonText}>Max</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Destination Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Destination</Text>

            <View style={styles.destinationRow}>
              <View style={styles.walletIconContainer}>
                <Ionicons name="wallet-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.destinationInfo}>
                <Text style={styles.walletAddress}>
                  {publicKey ? shortenAddress(publicKey, 8) : "Not connected"}
                </Text>
                <Text style={styles.destinationHint}>
                  Funds will be sent to your connected wallet
                </Text>
              </View>
            </View>
          </View>

          {/* Fee Notice */}
          <View style={styles.feeNotice}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
            <Text style={styles.feeText}>
              Network fee: ~{NETWORK_FEE_SOL} SOL
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Footer with Confirm Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (isWithdrawing || parsedAmount <= 0) && styles.confirmButtonDisabled,
            ]}
            onPress={handleWithdraw}
            disabled={isWithdrawing || parsedAmount <= 0}
            activeOpacity={0.8}
          >
            {isWithdrawing ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <>
                <Ionicons name="arrow-down-circle-outline" size={20} color={colors.background} />
                <Text style={styles.confirmButtonText}>Confirm Withdrawal</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },

  // Balance Card (Gradient)
  balanceCardGradient: {
    borderRadius: borderRadius.lg,
    padding: 1.5,
    marginBottom: spacing.lg,
  },
  balanceCardInner: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg - 1,
    padding: spacing.lg,
  },
  eventName: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: spacing.md,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  balanceItem: {
    flex: 1,
  },
  balanceDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  balanceLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  balanceHighlight: {
    color: colors.primary,
  },
  ticketsSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ticketsSummaryText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },

  // Cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: fonts.headingSemiBold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },

  // Amount Input
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontFamily: fonts.displayBold,
    color: colors.text,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  amountSuffix: {
    fontSize: 18,
    fontFamily: fonts.headingSemiBold,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  amountMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  usdEquivalent: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  maxButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryMuted,
  },
  maxButtonText: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },

  // Destination
  destinationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  walletIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  destinationInfo: {
    flex: 1,
  },
  walletAddress: {
    fontSize: 15,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
    marginBottom: 2,
  },
  destinationHint: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },

  // Fee Notice
  feeNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  feeText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },

  // Footer
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.surfaceLight,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.background,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
});
