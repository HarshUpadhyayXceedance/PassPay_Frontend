import React, { useRef, useEffect, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useEvents } from "../../hooks/useEvents";
import { useLoyalty } from "../../hooks/useLoyalty";
import { useMerchants } from "../../hooks/useMerchants";
import { formatDate, formatSOL } from "../../utils/formatters";
import { DynamicPriceIndicator } from "../../components/event/DynamicPriceIndicator";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const HERO_HEIGHT = 320;

function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function EventDetailsScreen() {
  const router = useRouter();
  const { eventKey } = useLocalSearchParams<{ eventKey: string }>();
  const { getEvent } = useEvents();
  const { loyaltyBenefits } = useLoyalty();
  const { seatTiers, fetchSeatTiers } = useMerchants();

  const scrollY = useRef(new Animated.Value(0)).current;
  const event = getEvent(eventKey as string);

  useFocusEffect(
    useCallback(() => {
      if (eventKey) {
        fetchSeatTiers(eventKey).catch(() => {});
      }
    }, [eventKey])
  );

  useEffect(() => {
    if (eventKey) fetchSeatTiers(eventKey);
  }, [eventKey]);

  const eventTiers = seatTiers.filter((t) => t.eventKey === eventKey);

  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT],
    outputRange: [0, -HERO_HEIGHT / 2],
    extrapolate: "clamp",
  });

  const heroOpacity = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT / 2, HERO_HEIGHT],
    outputRange: [1, 0.8, 0.3],
    extrapolate: "clamp",
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 100, HERO_HEIGHT],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  if (!event) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Event not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const totalCapacity = eventTiers.reduce((sum, t) => sum + t.totalSeats, 0);
  const seatsLeft = eventTiers.reduce((sum, t) => sum + t.availableSeats, 0);
  const isLowSeats = seatsLeft > 0 && seatsLeft < 50;

  const tierPrices = eventTiers.map((t) => t.price).filter((p) => p > 0);
  const minTierPrice = tierPrices.length > 0 ? Math.min(...tierPrices) : 0;

  const dynamicMultiplier =
    event.dynamicPricingEnabled && event.baseTicketPrice > 0
      ? event.currentTicketPrice / event.baseTicketPrice
      : 1;
  const startingPrice = minTierPrice * dynamicMultiplier;

  const discountPercent = event.loyaltyDiscountsEnabled && loyaltyBenefits
    ? loyaltyBenefits.ticketDiscount
    : 0;
  const discountAmount = startingPrice * (discountPercent / 100);
  const finalPrice = startingPrice - discountAmount;

  const isOnline = event?.eventType === "online";

  const handleBuyTicket = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/(user)/buy-ticket", params: { eventKey: event.publicKey } });
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.stickyHeader, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={[colors.surface, colors.background]}
          style={styles.stickyHeaderGradient}
        >
          <TouchableOpacity
            style={styles.stickyBackButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.stickyBackIcon}>{"<"}</Text>
          </TouchableOpacity>
          <Text style={styles.stickyHeaderTitle} numberOfLines={1}>
            {event.name}
          </Text>
          <View style={styles.stickyHeaderSpacer} />
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        <Animated.View
          style={[
            styles.heroContainer,
            {
              transform: [{ translateY: heroTranslateY }],
              opacity: heroOpacity,
            },
          ]}
        >
          {event.imageUrl ? (
            <Image
              source={{ uri: event.imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={["#6C5CE7", "#00CEC9"]}
              style={styles.heroPlaceholder}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}
          <LinearGradient
            colors={["transparent", "rgba(10,14,26,0.65)", colors.background]}
            locations={[0.2, 0.65, 1]}
            style={styles.heroGradient}
          />

          <View style={styles.heroOverlay}>
            <TouchableOpacity
              style={styles.iconCircle}
              onPress={() => router.back()}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={styles.iconText}>{"<"}</Text>
            </TouchableOpacity>

            <View style={styles.iconCircle}>
              <DynamicPriceIndicator
                isEnabled={event.dynamicPricingEnabled}
                basePrice={event.baseTicketPrice}
                currentPrice={event.currentTicketPrice}
              />
            </View>
          </View>

          <View style={styles.heroTitleContainer}>
            <Text style={styles.eventName} numberOfLines={2}>
              {event.name}
            </Text>
            {event.isCancelled && (
              <View style={styles.cancelledBadgeHero}>
                <Text style={styles.soldOutBadgeText}>CANCELLED</Text>
              </View>
            )}
            {event.isSoldOut && !event.isCancelled && (
              <View style={styles.soldOutBadgeHero}>
                <Text style={styles.soldOutBadgeText}>SOLD OUT</Text>
              </View>
            )}
          </View>
        </Animated.View>

        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} style={styles.chipIcon} />
            <Text style={styles.chipText}>{formatDate(event.eventDate)}</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="location-outline" size={13} color={colors.textSecondary} style={styles.chipIcon} />
            <Text style={styles.chipText} numberOfLines={1}>
              {event.venue}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.organizedCard}>
            <Text style={styles.organizedLabel}>Organized by</Text>
            <Text style={styles.organizedAddress}>
              {shortenAddress(event.admin, 6)}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Capacity</Text>
            <Text style={styles.statValue}>{totalCapacity}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Starting From</Text>
            <Text style={styles.statValue}>
              {minTierPrice > 0 ? `${formatSOL(startingPrice)} SOL` : "TBA"}
            </Text>
          </View>
        </View>

        {eventTiers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isOnline ? "Tickets Available" : "Seat Tiers"}
            </Text>
            <View style={styles.tiersContainer}>
              {eventTiers.map((tier) => {
                const adjustedPrice = tier.price * dynamicMultiplier;
                const isSoldOut = tier.availableSeats <= 0;
                return (
                  <View key={tier.publicKey} style={[styles.tierCard, isSoldOut && styles.tierCardSoldOut]}>
                    <View style={styles.tierCardTop}>
                      <Text style={styles.tierCardName}>{tier.name}</Text>
                      {tier.isRestricted && (
                        <View style={styles.vipBadge}>
                          <Text style={styles.vipBadgeText}>VIP</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.tierCardPrice}>
                      {dynamicMultiplier !== 1
                        ? `${formatSOL(adjustedPrice)} SOL`
                        : `${formatSOL(tier.price)} SOL`}
                    </Text>
                    <Text style={styles.tierCardSeats}>
                      {isSoldOut
                        ? "Sold Out"
                        : isOnline
                        ? `${tier.availableSeats} of ${tier.totalSeats} spots left`
                        : `${tier.availableSeats} of ${tier.totalSeats} seats left`}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Event</Text>
          <Text style={styles.descriptionText}>
            {event.description || `Join us for an unforgettable experience at ${event.name}. Every ticket is minted as a unique NFT on Solana, giving you verifiable proof of attendance and exclusive on-chain benefits.`}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          {isOnline ? (
            <View style={styles.onlineCard}>
              <View style={styles.onlineCardHeader}>
                <View style={styles.onlineIconBg}>
                  <Ionicons name="globe-outline" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.onlineCardTitle}>ONLINE EVENT</Text>
                  <Text style={styles.onlineCardPowered}>Powered by PassPay Live</Text>
                </View>
                <View style={styles.onlineLiveBadge}>
                  <View style={styles.onlineLiveDot} />
                  <Text style={styles.onlineLiveText}>LIVE</Text>
                </View>
              </View>

              <View style={styles.onlineCardDivider} />
              <Text style={styles.onlineCardDesc}>
                This event takes place in a live virtual audio room. Ticket holders can join the meeting directly in-app.
              </Text>

              <View style={styles.onlineFeatures}>
                <View style={styles.onlineFeatureChip}>
                  <Ionicons name="mic-outline" size={13} color={colors.primary} />
                  <Text style={styles.onlineFeatureText}>Live Audio</Text>
                </View>
                <View style={styles.onlineFeatureChip}>
                  <Ionicons name="chatbubble-outline" size={13} color={colors.primary} />
                  <Text style={styles.onlineFeatureText}>Live Chat</Text>
                </View>
                <View style={styles.onlineFeatureChip}>
                  <Ionicons name="shield-checkmark-outline" size={13} color={colors.primary} />
                  <Text style={styles.onlineFeatureText}>Ticket Verified</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderIcon}>🗺️</Text>
              <Text style={styles.mapPlaceholderText}>{event.venue}</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionDivider} />
        <View style={{ height: 180 }} />
      </Animated.ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomLeft}>
          {isOnline && (
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineBadgeText}>🌐 Online Event</Text>
            </View>
          )}
          {seatsLeft > 0 && (
            <View
              style={[
                styles.seatsLeftBadge,
                isLowSeats && styles.seatsLeftBadgeLow,
              ]}
            >
              <Text
                style={[
                  styles.seatsLeftText,
                  isLowSeats && styles.seatsLeftTextLow,
                ]}
              >
                {isOnline
                  ? `${seatsLeft} spots left`
                  : `Only ${seatsLeft} seats left`}
              </Text>
            </View>
          )}
          {event.isSoldOut && (
            <View style={styles.soldOutBadge}>
              <Text style={styles.soldOutText}>Sold Out</Text>
            </View>
          )}
          {discountPercent > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                🎖️ {discountPercent}% Loyalty Discount
              </Text>
            </View>
          )}
          <Text style={styles.totalPriceLabel}>
            {eventTiers.length > 1 ? "From" : "Price"}
          </Text>
          {discountPercent > 0 && (
            <Text style={styles.originalPrice}>
              {formatSOL(startingPrice)} SOL
            </Text>
          )}
          <Text style={styles.totalPriceValue}>
            {minTierPrice > 0 ? `${formatSOL(finalPrice)} SOL` : "TBA"}
          </Text>
        </View>

        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[
              styles.buyButton,
              (!event.isActive || event.isSoldOut || event.isCancelled) && styles.buyButtonDisabled,
            ]}
            activeOpacity={0.8}
            disabled={!event.isActive || event.isSoldOut || event.isCancelled}
            onPress={handleBuyTicket}
          >
            <Text style={styles.buyButtonText}>
              {event.isCancelled ? "Cancelled" : "Buy Ticket"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },

  heroContainer: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    position: "relative",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1B2545",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    position: "absolute",
    top: 52,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(20,24,41,0.75)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  heroTitleContainer: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },
  eventName: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 32,
    fontFamily: fonts.heading,
  },

  chipsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexShrink: 1,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
    flexShrink: 1,
  },

  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  organizedCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  organizedLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  organizedAddress: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
    fontFamily: "monospace",
  },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    color: colors.text,
    fontWeight: "700",
    fontFamily: fonts.heading,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
    fontFamily: fonts.heading,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    fontWeight: "400",
  },

  mapPlaceholder: {
    width: "100%",
    height: 170,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPlaceholderIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  mapPlaceholderText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  onlineCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: 16,
    overflow: "hidden",
  },
  onlineCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  onlineIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.primary}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineCardTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.text,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  onlineCardPowered: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  onlineLiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,255,163,0.12)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,255,163,0.25)",
  },
  onlineLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00FFA3",
  },
  onlineLiveText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: "#00FFA3",
    letterSpacing: 0.8,
  },
  onlineCardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  onlineCardDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  onlineFeatures: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  onlineFeatureChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${colors.primary}12`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${colors.primary}25`,
  },
  onlineFeatureText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.primary,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
    marginTop: 24,
    opacity: 0.6,
  },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 34,
  },
  bottomLeft: {
    flexShrink: 1,
    marginRight: 12,
  },
  seatsLeftBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,206,201,0.12)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  seatsLeftBadgeLow: {
    backgroundColor: "rgba(0,206,201,0.22)",
  },
  seatsLeftText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "600",
  },
  seatsLeftTextLow: {
    color: colors.primary,
  },
  soldOutBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,71,87,0.15)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  soldOutBadgeHero: {
    backgroundColor: "rgba(255,71,87,0.9)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  cancelledBadgeHero: {
    backgroundColor: "rgba(239,68,68,0.9)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  soldOutBadgeText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "700",
    letterSpacing: 1,
  },
  soldOutText: {
    fontSize: 11,
    color: "#FF4757",
    fontWeight: "600",
  },
  discountBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,193,7,0.15)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  discountText: {
    fontSize: 11,
    color: "#FFD700",
    fontWeight: "600",
  },
  totalPriceLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
    marginBottom: 2,
  },
  totalPriceValue: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: "800",
    fontFamily: fonts.heading,
  },
  originalPrice: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "500",
    textDecorationLine: "line-through",
    marginBottom: 2,
  },
  bottomActions: {
    flexDirection: "column",
    gap: 8,
    alignItems: "stretch",
  },
  onlineBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(108,92,231,0.15)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  onlineBadgeText: {
    fontSize: 11,
    color: "#6C5CE7",
    fontWeight: "600",
  },
  buyButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  buyButtonDisabled: {
    backgroundColor: "#2A3050",
  },
  buyButtonText: {
    fontSize: 14,
    color: colors.background,
    fontWeight: "700",
    fontFamily: fonts.bodySemiBold,
  },
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  stickyHeaderGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
  },
  stickyBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(20,24,41,0.8)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stickyBackIcon: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  stickyHeaderTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginHorizontal: 12,
    fontFamily: fonts.heading,
  },
  stickyHeaderSpacer: {
    width: 36,
  },

  tiersContainer: {
    gap: 10,
  },
  tierCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tierCardSoldOut: {
    opacity: 0.5,
  },
  tierCardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  tierCardName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    fontFamily: fonts.headingSemiBold,
    flex: 1,
  },
  vipBadge: {
    backgroundColor: "rgba(255,215,0,0.2)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  vipBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFD700",
    letterSpacing: 0.5,
  },
  tierCardPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
    fontFamily: fonts.heading,
    marginBottom: 2,
  },
  tierCardSeats: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
});
