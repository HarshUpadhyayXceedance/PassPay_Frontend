import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";
import { useEvents } from "../../hooks/useEvents";
import { useMerchants } from "../../hooks/useMerchants";
import { useWalletStore } from "../../store/walletStore";
import { useAuthStore } from "../../store/authStore";
import { EventDisplay } from "../../types/event";
import { formatSOL, formatDate } from "../../utils/formatters";

export function ManageEventsScreen() {
  const router = useRouter();
  const { events, fetchEvents, isLoading } = useEvents();
  const { seatTiers, fetchSeatTiers } = useMerchants();
  const publicKey = useWalletStore((s) => s.publicKey);
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = role === "super_admin";

  useEffect(() => {
    fetchEvents();
    fetchSeatTiers();
  }, []);

  // SuperAdmin sees all events, normal admin sees only their own
  // Sort newest first by event date
  const myEvents = (isSuperAdmin
    ? events
    : events.filter((e) => e.admin === publicKey)
  ).slice().sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());

  const handleCreateEvent = useCallback(() => {
    router.push("/(admin)/create-event");
  }, [router]);

  const handleEventPress = useCallback(
    (item: EventDisplay) => {
      router.push({ pathname: "/(admin)/event-details", params: { eventKey: item.publicKey } });
    },
    [router]
  );

  const renderEventItem = ({ item }: { item: EventDisplay }) => {
    const eventTiers = seatTiers.filter((t) => t.eventKey === item.publicKey);
    const soldCount = eventTiers.length > 0
      ? eventTiers.reduce((sum, t) => sum + t.seatsSold, 0)
      : item.ticketsSold;
    const totalCount = eventTiers.length > 0
      ? eventTiers.reduce((sum, t) => sum + t.totalSeats, 0)
      : item.totalSeats;
    const minPrice = eventTiers.length > 0
      ? Math.min(...eventTiers.map((t) => t.price))
      : item.currentTicketPrice;
    const sellPercentage =
      totalCount > 0 ? Math.round((soldCount / totalCount) * 100) : 0;

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => handleEventPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.eventCardInner}>
          {/* Left content */}
          <View style={styles.eventContent}>
            {/* Event name */}
            <Text style={styles.eventName} numberOfLines={1}>
              {item.name}
            </Text>

            {/* Venue row */}
            <View style={styles.infoRow}>
              <Ionicons
                name="location-outline"
                size={14}
                color={colors.accent}
              />
              <Text style={styles.infoText} numberOfLines={1}>
                {item.venue}
              </Text>
            </View>

            {/* Date row */}
            <View style={styles.infoRow}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={colors.secondary}
              />
              <Text style={styles.infoText}>
                {formatDate(item.eventDate)}
              </Text>
            </View>

            {/* Bottom row: tickets + price + status */}
            <View style={styles.bottomRow}>
              {/* Ticket stats */}
              <View style={styles.statChip}>
                <Ionicons
                  name="ticket-outline"
                  size={13}
                  color={colors.primary}
                />
                <Text style={styles.statText}>
                  {soldCount} / {totalCount} sold
                </Text>
              </View>

              {/* Price */}
              <View style={styles.statChip}>
                <Ionicons
                  name="logo-usd"
                  size={13}
                  color={colors.accentLight}
                />
                <Text style={styles.statText}>
                  {eventTiers.length > 0 ? `From ${formatSOL(minPrice)}` : formatSOL(minPrice)} SOL
                </Text>
              </View>

              {/* Status badge */}
              <View
                style={[
                  styles.statusBadge,
                  item.isActive
                    ? styles.statusActive
                    : styles.statusInactive,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: item.isActive
                        ? colors.success
                        : colors.error,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: item.isActive ? colors.success : colors.error,
                    },
                  ]}
                >
                  {item.isActive ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>

            {/* Sell percentage bar */}
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${sellPercentage}%`,
                    backgroundColor:
                      sellPercentage >= 80
                        ? colors.error
                        : sellPercentage >= 50
                          ? colors.warning
                          : colors.primary,
                  },
                ]}
              />
            </View>
          </View>

          {/* Chevron */}
          <View style={styles.chevronContainer}>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textMuted}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>{isSuperAdmin ? "All Events" : "My Events"}</Text>
          <Text style={styles.headerSubtitle}>
            {myEvents.length} {myEvents.length === 1 ? "event" : "events"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerCreateButton}
          onPress={handleCreateEvent}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color={colors.background} />
          <Text style={styles.headerCreateText}>Create</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons
            name="calendar-outline"
            size={64}
            color={colors.textMuted}
          />
        </View>
        <Text style={styles.emptyTitle}>No events yet</Text>
        <Text style={styles.emptySubtitle}>
          Create your first event and start selling tickets on the blockchain.
        </Text>
        <TouchableOpacity
          style={styles.emptyCreateButton}
          onPress={handleCreateEvent}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.background} />
          <Text style={styles.emptyCreateText}>Create Event</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={myEvents}
        renderItem={renderEventItem}
        keyExtractor={(item) => item.publicKey}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchEvents}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Floating Action Button */}
      {myEvents.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateEvent}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={colors.background} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: 100,
  },

  // ── Header ──────────────────────────────────────────
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.text,
  },
  headerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerCreateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    gap: 6,
  },
  headerCreateText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.background,
  },

  // ── Event Card ──────────────────────────────────────
  eventCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  eventCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  eventContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  eventName: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  statText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: "rgba(0, 255, 163, 0.1)",
  },
  statusInactive: {
    backgroundColor: "rgba(255, 71, 87, 0.1)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  chevronContainer: {
    padding: spacing.xs,
  },
  separator: {
    height: spacing.sm,
  },

  // ── Empty State ─────────────────────────────────────
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  emptyCreateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyCreateText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.background,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  // ── FAB ─────────────────────────────────────────────
  fab: {
    position: "absolute",
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
});
