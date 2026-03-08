import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PublicKey } from "@solana/web3.js";
import { AppCard } from "../../components/ui/AppCard";
import { AppButton } from "../../components/ui/AppButton";
import { AppHeader } from "../../components/ui/AppHeader";
import { DynamicPriceIndicator } from "../../components/event/DynamicPriceIndicator";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";
import { formatSOL, formatDate } from "../../utils/formatters";
import { useWallet } from "../../hooks/useWallet";
import { useMerchants } from "../../hooks/useMerchants";
import { updateDynamicPrice } from "../../solana/actions/updateDynamicPrice";
import { closeEvent } from "../../solana/actions/closeEvent";
import { apiCancelEvent } from "../../services/api/eventApi";
import { createProvider } from "../../solana/wallet/walletSession";
import { phantomWalletAdapter } from "../../solana/wallet/phantomWalletAdapter";
import { EventDisplay } from "../../types/event";
import { showSuccess, showWarning, showError } from "../../utils/alerts";
import { confirm } from "../../components/ui/ConfirmDialogProvider";
import { useRooms } from "../../hooks/useRooms";

interface EventDetailsAdminScreenProps {
  event: EventDisplay;
  onRefresh?: () => void;
}

export function EventDetailsAdminScreen({
  event,
  onRefresh,
}: EventDetailsAdminScreenProps) {
  const { publicKey } = useWallet();
  const router = useRouter();
  const { seatTiers, fetchSeatTiers } = useMerchants();
  const { joinMeeting } = useRooms();
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [isClosingEvent, setIsClosingEvent] = useState(false);
  const [isCancellingEvent, setIsCancellingEvent] = useState(false);
  const [isJoiningMeeting, setIsJoiningMeeting] = useState(false);

  useEffect(() => {
    fetchSeatTiers(event.publicKey);
  }, [event.publicKey]);

  const eventTiers = seatTiers.filter((t) => t.eventKey === event.publicKey);


  const totalCapacity = eventTiers.reduce((sum, t) => sum + t.totalSeats, 0);
  const totalSold = eventTiers.reduce((sum, t) => sum + t.seatsSold, 0);
  const totalAvailable = totalCapacity - totalSold;
  const tierRevenue = eventTiers.reduce((sum, t) => sum + t.seatsSold * t.price, 0);
  const fillRate = totalCapacity > 0
    ? ((totalSold / totalCapacity) * 100).toFixed(0)
    : "0";


  const tierPrices = eventTiers.map((t) => t.price).filter((p) => p > 0);
  const minTierPrice = tierPrices.length > 0 ? Math.min(...tierPrices) : 0;
  const maxTierPrice = tierPrices.length > 0 ? Math.max(...tierPrices) : 0;


  const dynamicMultiplier =
    event.dynamicPricingEnabled && event.baseTicketPrice > 0
      ? event.currentTicketPrice / event.baseTicketPrice
      : 1;
  const adjustedMinPrice = minTierPrice * dynamicMultiplier;
  const adjustedMaxPrice = maxTierPrice * dynamicMultiplier;

  const handleUpdatePrice = async () => {
    if (!publicKey) return;

    setIsUpdatingPrice(true);
    try {
      const callerPubkey = new PublicKey(publicKey);
      const eventPubkey = new PublicKey(event.publicKey);

      const sig = await updateDynamicPrice(callerPubkey, eventPubkey);
      showSuccess("Price Updated", `New price calculated.\n\nSig: ${sig.slice(0, 8)}...`);
      onRefresh?.();
    } catch (error: any) {
      showError("Error", error.message || "Failed to update price");
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const handleCloseEvent = () => {
    confirm({
      title: "Close Event",
      message: `Are you sure you want to close "${event.name}"?\n\nThis will deactivate the event and prevent further ticket sales.`,
      type: "danger",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        {
          text: "Close Event",
          style: "destructive",
          onPress: async () => {
            if (!publicKey) return;
            setIsClosingEvent(true);
            try {
              const provider = createProvider(phantomWalletAdapter);
              const eventPubkey = new PublicKey(event.publicKey);
              const sig = await closeEvent(provider, eventPubkey);
              showSuccess("Event Closed", `"${event.name}" has been closed.\n\nSig: ${sig.slice(0, 8)}...`);
              onRefresh?.();
            } catch (error: any) {
              showError("Error", error.message || "Failed to close event");
            } finally {
              setIsClosingEvent(false);
            }
          },
        },
      ],
    });
  };

  const handleCancelEvent = () => {
    confirm({
      title: "Cancel Event",
      message: `Are you sure you want to CANCEL "${event.name}"?\n\nThis will:\n- Stop all ticket sales\n- Open a 30-day refund window for all holders\n- Block fund release until refund window closes\n\nThis action cannot be undone.`,
      type: "danger",
      buttons: [
        { text: "Go Back", style: "cancel", onPress: () => {} },
        {
          text: "Cancel Event",
          style: "destructive",
          onPress: async () => {
            setIsCancellingEvent(true);
            try {
              const sig = await apiCancelEvent({
                eventPda: event.publicKey,
              });
              showSuccess("Event Cancelled", `"${event.name}" has been cancelled. A 30-day refund window is now open for all ticket holders.\n\nSig: ${sig.slice(0, 8)}...`);
              onRefresh?.();
            } catch (error: any) {
              const msg = error.message || "Failed to cancel event";
              if (msg.includes("EventAlreadyCancelled")) {
                showWarning("Already Cancelled", "This event has already been cancelled.");
              } else {
                showError("Error", msg);
              }
            } finally {
              setIsCancellingEvent(false);
            }
          },
        },
      ],
    });
  };

  const isOnlineEvent = event.eventType === "online";

  const handleStartMeeting = useCallback(async () => {
    setIsJoiningMeeting(true);
    try {
      const result = await joinMeeting(event.publicKey);
      if (result.token && result.livekitUrl) {
        router.push({
          pathname: "/(admin)/room",
          params: {
            roomId: `meeting-${event.publicKey}`,
            title: event.name,
            token: result.token,
            livekitUrl: result.livekitUrl,
            role: result.role,
            eventPda: event.publicKey,
            joinTimestamp: String(Date.now()),
          },
        });
      }
    } catch (err: any) {
      showError("Meeting Error", err.message ?? "Could not start meeting.");
    } finally {
      setIsJoiningMeeting(false);
    }
  }, [event, joinMeeting, router]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <AppHeader
        title="Event Details"
        onBack={() => router.back()}
      />


      <View style={styles.header}>
        {event.imageUrl ? (
          <Image
            source={{ uri: event.imageUrl }}
            style={styles.eventImage}
            resizeMode="cover"
          />
        ) : null}
        <Text style={styles.eventName}>{event.name}</Text>
        <Text style={styles.eventVenue}>{event.venue}</Text>
        {event.description ? (
          <Text style={styles.eventDescription}>{event.description}</Text>
        ) : null}
        <Text style={styles.eventDate}>{formatDate(event.eventDate)}</Text>

        {event.isCancelled && (
          <View style={styles.cancelledBadge}>
            <Ionicons name="close-circle" size={16} color={colors.error} />
            <Text style={styles.cancelledText}>EVENT CANCELLED</Text>
          </View>
        )}
        {!event.isActive && !event.isCancelled && (
          <View style={styles.closedBadge}>
            <Ionicons name="lock-closed" size={14} color={colors.warning} />
            <Text style={styles.closedText}>EVENT CLOSED</Text>
          </View>
        )}
      </View>


      <AppCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="pricetag" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Pricing</Text>
          </View>
          {event.dynamicPricingEnabled && (
            <DynamicPriceIndicator
              isEnabled
              basePrice={event.baseTicketPrice}
              currentPrice={event.currentTicketPrice}
            />
          )}
        </View>

        {eventTiers.length === 0 ? (
          <Text style={styles.noTiersText}>
            Add seat tiers to set pricing for this event.
          </Text>
        ) : (
          <>
            <View style={styles.priceRow}>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>
                  {minTierPrice === maxTierPrice ? "Tier Price" : "Price Range"}
                </Text>
                <Text style={styles.priceValue}>
                  {minTierPrice === maxTierPrice
                    ? `${formatSOL(minTierPrice)} SOL`
                    : `${formatSOL(minTierPrice)} – ${formatSOL(maxTierPrice)} SOL`}
                </Text>
              </View>
              {event.dynamicPricingEnabled && dynamicMultiplier !== 1 && (
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>Adjusted Range</Text>
                  <Text style={[styles.priceValue, styles.priceHighlight]}>
                    {adjustedMinPrice === adjustedMaxPrice
                      ? `${formatSOL(adjustedMinPrice)} SOL`
                      : `${formatSOL(adjustedMinPrice)} – ${formatSOL(adjustedMaxPrice)} SOL`}
                  </Text>
                </View>
              )}
            </View>

            {event.dynamicPricingEnabled && (
              <View style={styles.dynamicInfo}>
                <View>
                  <Text style={styles.dynamicLabel}>
                    Multiplier: {dynamicMultiplier.toFixed(2)}x
                  </Text>
                  <Text style={styles.dynamicLabel}>
                    Event Range: {formatSOL(event.minTicketPrice)} – {formatSOL(event.maxTicketPrice)} SOL
                  </Text>
                </View>
                <AppButton
                  title={isUpdatingPrice ? "Updating..." : "Update Price"}
                  variant="outline"
                  size="sm"
                  onPress={handleUpdatePrice}
                  loading={isUpdatingPrice}
                />
              </View>
            )}
          </>
        )}
      </AppCard>


      <AppCard style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="analytics" size={18} color={colors.secondary} />
          <Text style={styles.cardTitle}>Sales Analytics</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatBox label="Tickets Sold" value={totalSold.toString()} />
          <StatBox label="Available" value={totalAvailable.toString()} />
          <StatBox label="Fill Rate" value={`${fillRate}%`} />
          <StatBox label="Revenue" value={`${formatSOL(tierRevenue)} SOL`} />
        </View>


        <View style={styles.capacityBar}>
          <View
            style={[
              styles.capacityFill,
              { width: `${Math.min(parseFloat(fillRate), 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.capacityText}>
          {totalSold} / {totalCapacity} {isOnlineEvent ? "tickets sold" : "seats filled"}
        </Text>
      </AppCard>


      <AppCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="layers" size={18} color={colors.accent} />
            <Text style={styles.cardTitle}>
              {isOnlineEvent ? "Ticket Info" : "Seat Tiers"}
            </Text>
          </View>
          {!isOnlineEvent && (
            <AppButton
              title="+ Add Tier"
              variant="outline"
              size="sm"
              onPress={() =>
                router.push({
                  pathname: "/(admin)/add-seat-tier",
                  params: { eventKey: event.publicKey, eventName: event.name },
                })
              }
            />
          )}
        </View>

        {eventTiers.length === 0 ? (
          <Text style={styles.noTiersText}>
            No seat tiers configured. Add tiers to enable ticket sales.
          </Text>
        ) : (
          eventTiers.map((tier) => {
            const adjustedPrice = tier.price * dynamicMultiplier;
            const showAdjusted = event.dynamicPricingEnabled && dynamicMultiplier !== 1;
            return (
              <View key={tier.publicKey} style={styles.tierRow}>
                <View style={styles.tierInfo}>
                  <Text style={styles.tierName}>
                    {tier.name}
                    {tier.isRestricted ? " (VIP)" : ""}
                  </Text>
                  <Text style={styles.tierMeta}>
                    {showAdjusted
                      ? `${formatSOL(tier.price)} → ${formatSOL(adjustedPrice)} SOL`
                      : `${formatSOL(tier.price)} SOL`}
                    {" · "}{tier.seatsSold}/{tier.totalSeats} sold
                  </Text>
                </View>
                <View style={styles.tierBar}>
                  <View
                    style={[
                      styles.tierBarFill,
                      {
                        width: `${
                          tier.totalSeats > 0
                            ? Math.min((tier.seatsSold / tier.totalSeats) * 100, 100)
                            : 0
                        }%`,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })
        )}
      </AppCard>


      <AppCard style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="heart" size={18} color={colors.accent} />
          <Text style={styles.cardTitle}>Loyalty Settings</Text>
        </View>

        <InfoRow
          label="Loyalty Discounts"
          value={event.loyaltyDiscountsEnabled ? "Enabled" : "Disabled"}
          active={event.loyaltyDiscountsEnabled}
        />
        <InfoRow
          label="Dynamic Pricing"
          value={event.dynamicPricingEnabled ? "Enabled" : "Disabled"}
          active={event.dynamicPricingEnabled}
        />
        {event.earlyAccessDate instanceof Date && event.earlyAccessDate.getTime() > 0 ? (
          <InfoRow
            label="Early Access"
            value={formatDate(event.earlyAccessDate)}
          />
        ) : null}
        <InfoRow
          label="Public Sale"
          value={
            event.publicSaleDate instanceof Date && event.publicSaleDate.getTime() > 0
              ? formatDate(event.publicSaleDate)
              : "Immediate (open now)"
          }
        />
      </AppCard>


      {isOnlineEvent && event.isActive && !event.isCancelled && (
        <AppCard style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="videocam" size={18} color="#6C5CE7" />
            <Text style={styles.cardTitle}>Online Meeting</Text>
          </View>
          {event.isMeetingEnded ? (
            <View style={styles.meetingEndedRow}>
              <Ionicons name="stop-circle" size={18} color={colors.error} />
              <Text style={styles.meetingEndedText}>Meeting Ended</Text>
            </View>
          ) : (
            <>
              <Text style={styles.meetingHint}>
                You are the host. Joining gives you speaker (mic) access. Ticket holders join as listeners.
              </Text>
              <TouchableOpacity
                style={[styles.startMeetingBtn, isJoiningMeeting && styles.startMeetingBtnDisabled]}
                onPress={handleStartMeeting}
                disabled={isJoiningMeeting}
                activeOpacity={0.8}
              >
                {isJoiningMeeting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="mic" size={18} color="#FFFFFF" />
                    <Text style={styles.startMeetingBtnText}>Start / Join Meeting</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </AppCard>
      )}


      <View style={styles.actions}>
        <AppButton
          title="Edit Event"
          variant="outline"
          onPress={() => router.push({ pathname: "/(admin)/update-event", params: { eventKey: event.publicKey } })}
        />
        {!event.dynamicPricingEnabled && eventTiers.length > 0 && (
          <AppButton
            title="Enable Dynamic Pricing"
            onPress={() =>
              router.push({ pathname: "/(admin)/dynamic-pricing-setup", params: { eventKey: event.publicKey, basePrice: String(minTierPrice) } })
            }
          />
        )}
        {!isOnlineEvent && (
          <AppButton
            title="View Merchants"
            variant="outline"
            onPress={() => router.push({ pathname: "/(admin)/merchant-list", params: { eventKey: event.publicKey } })}
          />
        )}
        <AppButton
          title="Manage Refunds"
          variant="outline"
          onPress={() =>
            router.push({ pathname: "/(admin)/refund-management", params: { eventKey: event.publicKey } })
          }
        />
        <AppButton
          title="Release Escrow Funds"
          variant="outline"
          onPress={() =>
            router.push({ pathname: "/(admin)/release-funds", params: { eventKey: event.publicKey } })
          }
        />
        {event.isActive && (
          <AppButton
            title={isClosingEvent ? "Closing..." : "Close Event"}
            variant="outline"
            onPress={handleCloseEvent}
            loading={isClosingEvent}
            style={styles.closeEventButton}
          />
        )}
        {!event.isCancelled && (
          <AppButton
            title={isCancellingEvent ? "Cancelling..." : "Cancel Event"}
            variant="outline"
            onPress={handleCancelEvent}
            loading={isCancellingEvent}
            style={styles.cancelEventButton}
          />
        )}
      </View>
    </ScrollView>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, active && styles.infoActive]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  eventImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  eventName: {
    fontSize: 26,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  eventVenue: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginBottom: 4,
    lineHeight: 20,
  },
  eventDate: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  priceRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  priceItem: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 22,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  priceHighlight: {
    color: colors.primary,
  },
  dynamicInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  dynamicLabel: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    minWidth: "40%",
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  capacityBar: {
    width: "100%",
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  capacityFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  capacityText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
  infoActive: {
    color: colors.primary,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  closeEventButton: {
    borderColor: colors.error,
  },
  cancelEventButton: {
    borderColor: colors.error,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
  },
  meetingHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  meetingEndedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  meetingEndedText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.error,
  },
  startMeetingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: "#6C5CE7",
    borderRadius: 10,
    paddingVertical: 12,
  },
  startMeetingBtnDisabled: {
    opacity: 0.6,
  },
  startMeetingBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: "#FFFFFF",
  },
  cancelledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.sm,
    alignSelf: "flex-start",
  },
  cancelledText: {
    fontSize: 13,
    fontFamily: fonts.headingSemiBold,
    color: colors.error,
    letterSpacing: 0.5,
  },
  closedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.sm,
    alignSelf: "flex-start",
  },
  closedText: {
    fontSize: 13,
    fontFamily: fonts.headingSemiBold,
    color: colors.warning,
    letterSpacing: 0.5,
  },
  noTiersText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  tierRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tierInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  tierName: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
  tierMeta: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  tierBar: {
    width: "100%",
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  tierBarFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
});
