import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useEvents } from "../../hooks/useEvents";
import { useWallet } from "../../hooks/useWallet";
import { useLoyalty } from "../../hooks/useLoyalty";
import { apiBuyTicket } from "../../services/api/eventApi";
import { formatSOL } from "../../utils/formatters";
import { PriceBreakdown } from "../../components/event/PriceBreakdown";
import { EarlyAccessBadge } from "../../components/event/EarlyAccessBadge";
import { TicketPurchaseSuccess } from "../../components/animations/TicketPurchaseSuccess";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

const NETWORK_FEE = 0.000005;

export function BuyTicketScreen() {
  const router = useRouter();
  const { eventKey } = useLocalSearchParams<{ eventKey: string }>();
  const { getEvent } = useEvents();
  const { balance, refreshBalance } = useWallet();
  const { loyaltyBenefits, fetchLoyaltyBenefits } = useLoyalty();
  const [buying, setBuying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [purchasedMint, setPurchasedMint] = useState<string>("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const event = getEvent(eventKey as string);

  useEffect(() => {
    fetchLoyaltyBenefits();
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!event) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backArrow}>{"\u2190"}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Order</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Event not found</Text>
        </View>
      </View>
    );
  }

  // Calculate prices with loyalty discount
  const basePrice = event.baseTicketPrice || event.ticketPrice;
  const currentPrice = event.currentTicketPrice || event.ticketPrice;
  const discountPercent = event.loyaltyDiscountsEnabled
    ? loyaltyBenefits?.ticketDiscount || 0
    : 0;
  const discountAmount = currentPrice * (discountPercent / 100);
  const finalPrice = currentPrice - discountAmount;
  const total = finalPrice + NETWORK_FEE;
  const canAfford = balance >= total;

  const handleBuy = async () => {
    if (!canAfford) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Insufficient Funds", "You don't have enough SOL.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBuying(true);

    try {
      const metadataUri = `https://arweave.net/placeholder-${Date.now()}`;
      const result = await apiBuyTicket(event.publicKey, metadataUri);
      await refreshBalance();

      // Success - show modal with confetti
      setPurchasedMint(result.mint);
      setShowSuccess(true);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message ?? "Failed to buy ticket");
      setBuying(false);
    }
  };

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
          <Text style={styles.backArrow}>{"\u2190"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Order</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Animated.ScrollView
        style={[
          styles.scrollView,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Item Details */}
        <Text style={styles.sectionLabel}>ITEM DETAILS</Text>
        <View style={styles.card}>
          <View style={styles.itemRow}>
            <LinearGradient
              colors={["#6C5CE7", "#00CEC9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nftImage}
            />
            <View style={styles.itemInfo}>
              <View style={styles.badgeContainer}>
                <View style={styles.vipBadge}>
                  <Text style={styles.vipBadgeText}>VIP Access NFT</Text>
                </View>
                {event.earlyAccessDate && event.publicSaleDate && loyaltyBenefits && (
                  <EarlyAccessBadge
                    earlyAccessDate={
                      typeof event.earlyAccessDate === 'number'
                        ? event.earlyAccessDate
                        : event.earlyAccessDate.getTime() / 1000
                    }
                    publicSaleDate={
                      typeof event.publicSaleDate === 'number'
                        ? event.publicSaleDate
                        : event.publicSaleDate.getTime() / 1000
                    }
                    userTier={loyaltyBenefits.currentTier}
                  />
                )}
              </View>
              <Text style={styles.eventName} numberOfLines={2}>
                {event.name}
              </Text>
              <Text style={styles.priceGreen}>
                {formatSOL(currentPrice)} SOL
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
        <View style={styles.card}>
          <View style={styles.paymentRow}>
            <View style={styles.walletIconContainer}>
              <Text style={styles.walletIcon}>{"\uD83D\uDCB3"}</Text>
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>Local Wallet</Text>
              <Text style={styles.paymentBalance}>
                Balance: {formatSOL(balance)} SOL
              </Text>
            </View>
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>{"\u2713"}</Text>
            </View>
          </View>
        </View>

        {/* Price Breakdown */}
        <Text style={styles.sectionLabel}>PRICE BREAKDOWN</Text>
        <PriceBreakdown
          basePrice={basePrice}
          currentPrice={currentPrice}
          discountPercent={discountPercent}
          tier={loyaltyBenefits?.currentTier || 0}
          showDynamic={event.dynamicPricingEnabled}
        />

        {/* Payment Summary */}
        <Text style={styles.sectionLabel}>PAYMENT SUMMARY</Text>
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ticket Price</Text>
            <Text style={styles.summaryValue}>
              {formatSOL(finalPrice)} SOL
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.networkFeeLabel}>
              <Text style={styles.summaryLabel}>Network Fee</Text>
              <View style={styles.solanaBadge}>
                <Text style={styles.solanaBadgeText}>Solana</Text>
              </View>
            </View>
            <Text style={styles.summaryValue}>
              {formatSOL(NETWORK_FEE)} SOL
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatSOL(total)} SOL</Text>
          </View>
        </View>

        {!canAfford && (
          <Text style={styles.warningText}>
            Insufficient balance. You need {formatSOL(total - balance)} more
            SOL.
          </Text>
        )}
      </Animated.ScrollView>

      {/* Bottom */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (buying || !canAfford) && styles.confirmButtonDisabled,
          ]}
          onPress={handleBuy}
          disabled={buying || !canAfford}
          activeOpacity={0.8}
        >
          {buying ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Payment</Text>
          )}
        </TouchableOpacity>
        <View style={styles.securedRow}>
          <Text style={styles.shieldIcon}>{"\uD83D\uDEE1\uFE0F"}</Text>
          <Text style={styles.securedText}>Secured by Solana Blockchain</Text>
        </View>
      </View>

      {/* Success Modal with Confetti */}
      <TicketPurchaseSuccess
        visible={showSuccess}
        mintAddress={purchasedMint}
        eventName={event?.name || ""}
        onComplete={() => router.push("/(user)/my-passes")}
        duration={2500}
      />
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 20,
    color: colors.text,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  nftImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 14,
  },
  badgeContainer: {
    flexDirection: "row",
    marginBottom: 6,
  },
  vipBadge: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  vipBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    color: colors.primary,
  },
  eventName: {
    fontSize: 16,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    marginBottom: 4,
  },
  priceGreen: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: colors.secondary,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  walletIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.secondaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  walletIcon: {
    fontSize: 20,
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentTitle: {
    fontSize: 15,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    marginBottom: 2,
  },
  paymentBalance: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
  networkFeeLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  solanaBadge: {
    backgroundColor: colors.secondaryMuted,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  solanaBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bodySemiBold,
    color: colors.secondary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.secondary,
  },
  warningText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.error,
    textAlign: "center",
    marginTop: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.secondary,
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  securedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  shieldIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  securedText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
});
