import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
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
import { updateDynamicPrice } from "../../solana/actions/updateDynamicPrice";
import { EventDisplay } from "../../types/event";

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
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  const revenue = event.ticketsSold * event.currentTicketPrice;
  const fillRate =
    event.totalSeats > 0
      ? ((event.ticketsSold / event.totalSeats) * 100).toFixed(0)
      : "0";

  const handleUpdatePrice = async () => {
    if (!publicKey) return;

    setIsUpdatingPrice(true);
    try {
      const callerPubkey = new PublicKey(publicKey);
      const eventPubkey = new PublicKey(event.publicKey);

      const sig = await updateDynamicPrice(callerPubkey, eventPubkey);
      Alert.alert("Price Updated", `New price calculated.\n\nSig: ${sig.slice(0, 8)}...`);
      onRefresh?.();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update price");
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back / Title Header */}
      <AppHeader
        title="Event Details"
        onBack={() => router.back()}
      />

      {/* Event Header */}
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
      </View>

      {/* Pricing Section */}
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

        <View style={styles.priceRow}>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Base Price</Text>
            <Text style={styles.priceValue}>{formatSOL(event.baseTicketPrice)} SOL</Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Current Price</Text>
            <Text style={[styles.priceValue, styles.priceHighlight]}>
              {formatSOL(event.currentTicketPrice)} SOL
            </Text>
          </View>
        </View>

        {event.dynamicPricingEnabled && (
          <View style={styles.dynamicInfo}>
            <Text style={styles.dynamicLabel}>
              Range: {formatSOL(event.minTicketPrice)} - {formatSOL(event.maxTicketPrice)} SOL
            </Text>
            <AppButton
              title={isUpdatingPrice ? "Updating..." : "Update Price Now"}
              variant="outline"
              size="sm"
              onPress={handleUpdatePrice}
              loading={isUpdatingPrice}
            />
          </View>
        )}
      </AppCard>

      {/* Sales Analytics */}
      <AppCard style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="analytics" size={18} color={colors.secondary} />
          <Text style={styles.cardTitle}>Sales Analytics</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatBox label="Tickets Sold" value={event.ticketsSold.toString()} />
          <StatBox label="Available" value={event.availableSeats.toString()} />
          <StatBox label="Fill Rate" value={`${fillRate}%`} />
          <StatBox label="Revenue" value={`${formatSOL(revenue)} SOL`} />
        </View>

        {/* Simple capacity bar */}
        <View style={styles.capacityBar}>
          <View
            style={[
              styles.capacityFill,
              { width: `${Math.min(parseFloat(fillRate), 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.capacityText}>
          {event.ticketsSold} / {event.totalSeats} seats filled
        </Text>
      </AppCard>

      {/* Loyalty Settings */}
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
        {event.earlyAccessDate && (
          <InfoRow
            label="Early Access"
            value={formatDate(event.earlyAccessDate instanceof Date ? event.earlyAccessDate : new Date(event.earlyAccessDate * 1000))}
          />
        )}
        {event.publicSaleDate && (
          <InfoRow
            label="Public Sale"
            value={formatDate(event.publicSaleDate instanceof Date ? event.publicSaleDate : new Date(event.publicSaleDate * 1000))}
          />
        )}
      </AppCard>

      {/* Actions */}
      <View style={styles.actions}>
        <AppButton
          title="Edit Event"
          variant="outline"
          onPress={() => router.push({ pathname: "/(admin)/update-event/[eventKey]", params: { eventKey: event.publicKey } })}
        />
        {!event.dynamicPricingEnabled && (
          <AppButton
            title="Enable Dynamic Pricing"
            onPress={() =>
              router.push({ pathname: "/(admin)/dynamic-pricing-setup", params: { eventKey: event.publicKey, basePrice: String(event.baseTicketPrice) } })
            }
          />
        )}
        <AppButton
          title="View Merchants"
          variant="outline"
          onPress={() => router.push("/(admin)/merchant-list")}
        />
        <AppButton
          title="Manage Refunds"
          variant="outline"
          onPress={() =>
            router.push({ pathname: "/(admin)/refund-management", params: { eventKey: event.publicKey } })
          }
        />
        <AppButton
          title="Withdraw Funds"
          variant="outline"
          onPress={() =>
            router.push({ pathname: "/(admin)/withdraw-funds", params: { eventKey: event.publicKey } })
          }
        />
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
});
