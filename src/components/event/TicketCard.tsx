import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AppCard } from "../ui/AppCard";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { TicketDisplay } from "../../types/ticket";
import { formatDate } from "../../utils/formatters";

interface TicketCardProps {
  ticket: TicketDisplay;
  onPress?: () => void;
}

export function TicketCard({ ticket, onPress }: TicketCardProps) {
  return (
    <AppCard onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.eventName} numberOfLines={1}>
          {ticket.eventName}
        </Text>
        <Text style={styles.seatNumber}>#{ticket.seatNumber}</Text>
      </View>

      <Text style={styles.venue} numberOfLines={1}>
        {ticket.eventVenue}
      </Text>
      <Text style={styles.date}>{formatDate(ticket.eventDate)}</Text>

      <View style={styles.footer}>
        <View
          style={[
            styles.statusBadge,
            ticket.isCheckedIn ? styles.checkedIn : styles.notCheckedIn,
          ]}
        >
          <Text style={styles.statusText}>
            {ticket.isCheckedIn ? "Checked In" : "Valid"}
          </Text>
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  eventName: {
    ...typography.bodyBold,
    color: colors.text,
    flex: 1,
  },
  seatNumber: {
    ...typography.h3,
    color: colors.primary,
  },
  venue: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  date: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  checkedIn: {
    backgroundColor: colors.success + "30",
  },
  notCheckedIn: {
    backgroundColor: colors.primary + "30",
  },
  statusText: {
    ...typography.small,
    color: colors.text,
    fontWeight: "600",
  },
});
