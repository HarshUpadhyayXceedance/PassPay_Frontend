import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useEvents } from "../../hooks/useEvents";
import { useWallet } from "../../hooks/useWallet";
import { useLoyalty } from "../../hooks/useLoyalty";
import { useMerchants } from "../../hooks/useMerchants";
import { SeatTierDisplay } from "../../types/merchant";
import { apiBuyTicket } from "../../services/api/eventApi";
import { uploadMetadata } from "../../services/api/uploadApi";
import {
  scheduleLocalNotification,
  scheduleNotificationAt,
} from "../../services/notifications/pushNotifications";
import { formatSOL } from "../../utils/formatters";
import { showWarning, showError } from "../../utils/alerts";
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
  const { seatTiers, fetchSeatTiers } = useMerchants();
  const [buying, setBuying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [purchasedMint, setPurchasedMint] = useState<string>("");
  const [selectedTier, setSelectedTier] = useState<SeatTierDisplay | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const event = getEvent(eventKey as string);

  const eventTiers = seatTiers.filter((t) => t.eventKey === eventKey);

  useEffect(() => {
    if (eventTiers.length > 0 && !selectedTier) {
      const firstAvailable = eventTiers.find((t) => t.availableSeats > 0);
      if (firstAvailable) setSelectedTier(firstAvailable);
    }
  }, [eventTiers.length]);

  // expo-router caches screens; reset transient state on re-focus
  useFocusEffect(
    useCallback(() => {
      setShowSuccess(false);
      setPurchasedMint("");
      setBuying(false);
      setSelectedTier(null);
    }, [])
  );

  useEffect(() => {
    fetchLoyaltyBenefits();
    if (eventKey) fetchSeatTiers(eventKey);
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

  const dynamicMultiplier =
    event.dynamicPricingEnabled && event.baseTicketPrice > 0
      ? event.currentTicketPrice / event.baseTicketPrice
      : 1;

  const tierBasePrice = selectedTier ? selectedTier.price : 0;
  const basePrice = tierBasePrice;
  const currentPrice = tierBasePrice * dynamicMultiplier;
  const discountPercent = event.loyaltyDiscountsEnabled
    ? loyaltyBenefits?.ticketDiscount || 0
    : 0;
  const discountAmount = currentPrice * (discountPercent / 100);
  const finalPrice = currentPrice - discountAmount;
  const total = finalPrice + NETWORK_FEE;
  const canAfford = balance >= total;
  const canBuy = canAfford && selectedTier != null && selectedTier.availableSeats > 0;

  const handleBuy = async () => {
    if (!selectedTier) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showWarning("Select a Tier", "Please select a seat tier before purchasing.");
      return;
    }
    if (!canAfford) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showWarning("Insufficient Funds", "You don't have enough SOL.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBuying(true);

    try {
      const metadataUri = await uploadMetadata({
        name: `${event.name} - ${selectedTier.name} Ticket`,
        symbol: "PASS",
        description: `${selectedTier.name} ticket for ${event.name} at ${event.venue}`,
        image: event.imageUrl || "",
        attributes: [
          { trait_type: "Event", value: event.name },
          { trait_type: "Venue", value: event.venue },
          { trait_type: "Tier", value: selectedTier.name },
          { trait_type: "Price (SOL)", value: formatSOL(currentPrice) },
        ],
      });
      const result = await apiBuyTicket(event.publicKey, selectedTier.publicKey, metadataUri);
      await refreshBalance();

      scheduleLocalNotification(
        "Ticket Purchased!",
        `You got a ticket for ${event.name}. See you there!`
      );

      if (event.eventDate) {
        const reminderDate = new Date(event.eventDate);
        reminderDate.setHours(reminderDate.getHours() - 1);
        if (reminderDate > new Date()) {
          scheduleNotificationAt(
            "Event Starting Soon",
            `${event.name} starts in 1 hour at ${event.venue}`,
            reminderDate
          );
        }
      }

      setPurchasedMint(result.mint);
      setBuying(false);
      setShowSuccess(true);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = error.message ?? "Failed to buy ticket";
      if (msg.includes("VipTierRestricted") || msg.includes("6053")) {
        showWarning("VIP Tier Restricted", "This seat tier is reserved for Gold and Platinum badge holders only. Keep attending events to level up your badge!");
      } else if (msg.includes("TierSoldOut") || msg.includes("6051")) {
        showWarning("Sold Out", "This seat tier is fully sold out. Please try a different tier.");
      } else if (msg.includes("SoldOut") || msg.includes("6004")) {
        showWarning("Sold Out", "All tickets for this event are sold out.");
      } else if (msg.includes("Cancelled") || msg.includes("CancellationException")) {
        showWarning("Cancelled", "Transaction was cancelled.");
      } else {
        showError("Error", msg);
      }
      setBuying(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
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

        {eventTiers.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>SELECT SEAT TIER</Text>
            <View style={styles.tierList}>
              {eventTiers.map((tier) => {
                const isSelected = selectedTier?.publicKey === tier.publicKey;
                const isSoldOut = tier.availableSeats <= 0;
                return (
                  <TouchableOpacity
                    key={tier.publicKey}
                    style={[
                      styles.tierCard,
                      isSelected && styles.tierCardSelected,
                      isSoldOut && styles.tierCardDisabled,
                    ]}
                    onPress={() => {
                      if (!isSoldOut) setSelectedTier(tier);
                    }}
                    disabled={isSoldOut}
                    activeOpacity={0.8}
                  >
                    <View style={styles.tierCardHeader}>
                      <Text style={[styles.tierName, isSelected && styles.tierNameSelected]}>
                        {tier.name}
                      </Text>
                      {tier.isRestricted && (
                        <View style={styles.vipOnlyBadge}>
                          <Text style={styles.vipOnlyText}>VIP ONLY</Text>
                        </View>
                      )}
                      {isSelected && (
                        <View style={styles.selectedDot}>
                          <Text style={styles.selectedDotText}>{"\u2713"}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.tierPrice, isSelected && styles.tierPriceSelected]}>
                      {dynamicMultiplier !== 1
                        ? `${formatSOL(tier.price * dynamicMultiplier)} SOL`
                        : `${formatSOL(tier.price)} SOL`}
                    </Text>
                    <Text style={styles.tierSeats}>
                      {isSoldOut ? "Sold Out" : `${tier.availableSeats} of ${tier.totalSeats} left`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

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

        <Text style={styles.sectionLabel}>PRICE BREAKDOWN</Text>
        <PriceBreakdown
          basePrice={basePrice}
          currentPrice={currentPrice}
          discountPercent={discountPercent}
          tier={loyaltyBenefits?.currentTier || 0}
          showDynamic={event.dynamicPricingEnabled}
        />

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

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (buying || !canBuy) && styles.confirmButtonDisabled,
          ]}
          onPress={handleBuy}
          disabled={buying || !canBuy}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={buying ? "Processing payment" : `Confirm payment of ${formatSOL(total)} SOL`}
          accessibilityState={{ disabled: buying || !canAfford, busy: buying }}
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

  tierList: {
    gap: 10,
  },
  tierCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  tierCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  tierCardDisabled: {
    opacity: 0.4,
  },
  tierCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  tierName: {
    fontSize: 15,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    flex: 1,
  },
  tierNameSelected: {
    color: colors.primary,
  },
  vipOnlyBadge: {
    backgroundColor: "rgba(255,215,0,0.2)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  vipOnlyText: {
    fontSize: 10,
    fontFamily: fonts.bodyBold,
    color: "#FFD700",
    letterSpacing: 0.5,
  },
  selectedDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedDotText: {
    fontSize: 14,
    color: colors.background,
    fontWeight: "700",
  },
  tierPrice: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.secondary,
    marginBottom: 2,
  },
  tierPriceSelected: {
    color: colors.primary,
  },
  tierSeats: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
});
