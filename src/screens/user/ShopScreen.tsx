import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTickets } from "../../hooks/useTickets";
import { useEvents } from "../../hooks/useEvents";
import { useMerchants } from "../../hooks/useMerchants";
import { EventDisplay } from "../../types/event";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing, borderRadius } from "../../theme/spacing";

const GRADIENT_PALETTES: [string, string][] = [
  ["#6C5CE7", "#a855f7"],
  ["#00CEC9", "#0891b2"],
  ["#e17055", "#f97316"],
  ["#fd79a8", "#ec4899"],
  ["#0984e3", "#6366f1"],
];

export function ShopScreen() {
  const router = useRouter();
  const { tickets, fetchMyTickets, isLoading: ticketsLoading } = useTickets();
  const { events, fetchEvents, isLoading: eventsLoading } = useEvents();
  const { merchants, fetchMerchants } = useMerchants();

  useEffect(() => {
    fetchMyTickets();
    fetchEvents();
    fetchMerchants();
  }, []);

  const isLoading = ticketsLoading || eventsLoading;

  const onRefresh = useCallback(async () => {
    await Promise.all([fetchMyTickets(), fetchEvents(), fetchMerchants()]);
  }, []);

  // Get unique event keys from user's tickets
  const myEventKeys = [...new Set(tickets.map((t) => t.eventKey))];

  // Get event details for each, and count merchants per event
  const myEvents = myEventKeys
    .map((eventKey) => {
      const event = events.find((e) => e.publicKey === eventKey);
      const eventMerchants = merchants.filter(
        (m) => m.eventKey === eventKey && m.isActive
      );
      const ticketCount = tickets.filter((t) => t.eventKey === eventKey).length;
      return { event, eventKey, merchantCount: eventMerchants.length, ticketCount };
    })
    .filter((item) => item.event != null) as {
      event: EventDisplay;
      eventKey: string;
      merchantCount: number;
      ticketCount: number;
    }[];

  const navigateToScan = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(user)/scan");
  }, [router]);

  const renderEventCard = ({
    item,
    index,
  }: {
    item: (typeof myEvents)[0];
    index: number;
  }) => {
    const { event, merchantCount, ticketCount } = item;
    const gradient = GRADIENT_PALETTES[index % GRADIENT_PALETTES.length];
    const eventDate = event.eventDate
      ? new Date(event.eventDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";

    return (
      <TouchableOpacity
        style={styles.eventCard}
        activeOpacity={0.8}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({
            pathname: "/(user)/event-merchants",
            params: { eventKey: item.eventKey, eventName: event.name },
          });
        }}
      >
        <View style={styles.eventCardRow}>
          {event.imageUrl ? (
            <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />
          ) : (
            <LinearGradient colors={gradient} style={styles.eventImage}>
              <Ionicons name="calendar" size={24} color="rgba(255,255,255,0.6)" />
            </LinearGradient>
          )}
          <View style={styles.eventInfo}>
            <Text style={styles.eventName} numberOfLines={2}>
              {event.name}
            </Text>
            <View style={styles.eventMeta}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text style={styles.eventMetaText} numberOfLines={1}>
                {event.venue}
              </Text>
            </View>
            {eventDate ? (
              <View style={styles.eventMeta}>
                <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                <Text style={styles.eventMetaText}>{eventDate}</Text>
              </View>
            ) : null}
            <View style={styles.eventBadges}>
              <View style={styles.badge}>
                <Ionicons name="ticket-outline" size={11} color={colors.primary} />
                <Text style={styles.badgeText}>
                  {ticketCount} ticket{ticketCount !== 1 ? "s" : ""}
                </Text>
              </View>
              {merchantCount > 0 && (
                <View style={styles.badge}>
                  <Ionicons name="storefront-outline" size={11} color={colors.secondary} />
                  <Text style={styles.badgeText}>
                    {merchantCount} merchant{merchantCount !== 1 ? "s" : ""}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Shop</Text>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={navigateToScan}
          activeOpacity={0.7}
        >
          <Ionicons name="qr-code-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={myEvents}
        keyExtractor={(item) => item.eventKey}
        renderItem={renderEventCard}
        contentContainerStyle={[
          styles.listContent,
          myEvents.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          myEvents.length > 0 ? (
            <View>
              {/* Scan to Pay CTA */}
              <TouchableOpacity activeOpacity={0.8} onPress={navigateToScan}>
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.scanCta}
                >
                  <View style={styles.scanCtaContent}>
                    <View style={styles.scanCtaLeft}>
                      <Text style={styles.scanCtaTitle}>Scan to Pay</Text>
                      <Text style={styles.scanCtaSubtitle}>
                        Scan a merchant's QR code to pay with SOL
                      </Text>
                    </View>
                    <Ionicons
                      name="qr-code"
                      size={44}
                      color="rgba(255,255,255,0.3)"
                    />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>
                Your Events ({myEvents.length})
              </Text>
              <Text style={styles.sectionSubtitle}>
                Browse merchants and products at events you have tickets for
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons
                  name="storefront-outline"
                  size={48}
                  color={colors.textMuted}
                />
              </View>
              <Text style={styles.emptyTitle}>No Events Yet</Text>
              <Text style={styles.emptyMessage}>
                Purchase tickets to events to browse their merchants and
                products here. You can also use Scan to Pay at vendor booths.
              </Text>
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => router.push("/(user)/")}
                activeOpacity={0.7}
              >
                <Ionicons name="compass-outline" size={18} color={colors.text} />
                <Text style={styles.exploreButtonText}>Explore Events</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  scanButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl + 20,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  scanCta: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  scanCtaContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scanCtaLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  scanCtaTitle: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: "#fff",
    marginBottom: 4,
  },
  scanCtaSubtitle: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  eventCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  eventCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  eventImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  eventInfo: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  eventName: {
    fontSize: 15,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  eventMetaText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
    flex: 1,
  },
  eventBadges: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  exploreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
  },
  exploreButtonText: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
  },
});
