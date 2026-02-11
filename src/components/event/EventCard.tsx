import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AppCard } from "../ui/AppCard";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { EventDisplay } from "../../types/event";
import { formatDate, formatSOL } from "../../utils/formatters";

interface EventCardProps {
  event: EventDisplay;
  onPress?: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  return (
    <AppCard onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {event.name}
        </Text>
        {event.isActive ? (
          <View style={styles.activeBadge}>
            <Text style={styles.badgeText}>Active</Text>
          </View>
        ) : (
          <View style={styles.inactiveBadge}>
            <Text style={styles.badgeText}>Closed</Text>
          </View>
        )}
      </View>

      <Text style={styles.venue} numberOfLines={1}>
        {event.venue}
      </Text>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>
            {formatDate(event.eventDate)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Price</Text>
          <Text style={styles.detailValue}>
            {formatSOL(event.ticketPrice)} SOL
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Seats</Text>
          <Text style={styles.detailValue}>
            {event.ticketsSold}/{event.totalSeats}
          </Text>
        </View>
      </View>

      {event.isSoldOut && (
        <View style={styles.soldOutBanner}>
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
  activeBadge: {
    backgroundColor: colors.success + "30",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  inactiveBadge: {
    backgroundColor: colors.textMuted + "30",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    ...typography.small,
    color: colors.text,
  },
  venue: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  details: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailItem: {
    alignItems: "center",
  },
  detailLabel: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "600",
  },
  soldOutBanner: {
    backgroundColor: colors.error + "20",
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    alignItems: "center",
  },
  soldOutText: {
    ...typography.small,
    color: colors.error,
    fontWeight: "700",
  },
});
