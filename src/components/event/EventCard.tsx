import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppCard } from "../ui/AppCard";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing, borderRadius } from "../../theme/spacing";
import { fonts } from "../../theme/fonts";
import { EventDisplay } from "../../types/event";
import { formatDate, formatSOL } from "../../utils/formatters";

interface EventCardProps {
  event: EventDisplay;
  onPress?: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const isCancelled = (event as any).isCancelled;

  return (
    <AppCard onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {event.name}
        </Text>
        {isCancelled ? (
          <View style={styles.cancelledBadge}>
            <View style={[styles.statusDot, { backgroundColor: colors.error }]} />
            <Text style={[styles.badgeText, { color: colors.error }]}>Cancelled</Text>
          </View>
        ) : event.isActive ? (
          <View style={styles.activeBadge}>
            <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.badgeText, { color: colors.primary }]}>Active</Text>
          </View>
        ) : (
          <View style={styles.inactiveBadge}>
            <View style={[styles.statusDot, { backgroundColor: colors.textMuted }]} />
            <Text style={[styles.badgeText, { color: colors.textMuted }]}>Closed</Text>
          </View>
        )}
      </View>

      <View style={styles.venueRow}>
        <Ionicons name="location-outline" size={13} color={colors.textMuted} />
        <Text style={styles.venue} numberOfLines={1}>
          {event.venue}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <View style={[styles.detailIconWrap, { backgroundColor: colors.accentMuted }]}>
            <Ionicons name="calendar-outline" size={14} color={colors.accent} />
          </View>
          <View>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>
              {formatDate(event.eventDate)}
            </Text>
          </View>
        </View>
        <View style={styles.detailItem}>
          <View style={[styles.detailIconWrap, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="pricetag-outline" size={14} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>
              {(event.currentTicketPrice || event.ticketPrice) > 0.0001
                ? `${formatSOL(event.currentTicketPrice || event.ticketPrice)} SOL`
                : "Tier-based"}
            </Text>
          </View>
        </View>
        <View style={styles.detailItem}>
          <View style={[styles.detailIconWrap, { backgroundColor: colors.secondaryMuted }]}>
            <Ionicons name="ticket-outline" size={14} color={colors.secondary} />
          </View>
          <View>
            <Text style={styles.detailLabel}>Sold</Text>
            <Text style={styles.detailValue}>
              {event.ticketsSold}
            </Text>
          </View>
        </View>
      </View>

      {event.isSoldOut && (
        <View style={styles.soldOutBanner}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={styles.soldOutText}>SOLD OUT</Text>
        </View>
      )}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  name: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  inactiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  cancelledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.errorLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
  },
  venueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: spacing.sm,
  },
  venue: {
    ...typography.bodySm,
    color: colors.textSecondary,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  details: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  detailIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    ...typography.small,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
  },
  soldOutBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.errorLight,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
  },
  soldOutText: {
    ...typography.tag,
    color: colors.error,
  },
});
