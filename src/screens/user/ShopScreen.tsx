import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMerchants } from "../../hooks/useMerchants";
import { useEvents } from "../../hooks/useEvents";
import { useLoyalty } from "../../hooks/useLoyalty";
import { MerchantDisplay } from "../../types/merchant";
import { formatSOL } from "../../utils/formatters";
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
  const { merchants, fetchMerchants, isLoading } = useMerchants();
  const { events } = useEvents();
  const { loyaltyBenefits } = useLoyalty();
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchMerchants();
  }, []);

  const merchantDiscount = loyaltyBenefits?.merchantDiscount ?? 0;

  // Filter merchants by search and active status
  const filteredMerchants = useMemo(() => {
    const active = merchants.filter((m) => m.isActive);
    if (!search.trim()) return active;
    const query = search.toLowerCase();
    return active.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query)
    );
  }, [merchants, search]);

  // Get event name for a merchant
  const getEventName = useCallback(
    (eventKey: string): string => {
      const event = events.find((e) => e.publicKey === eventKey);
      return event?.name ?? "Event";
    },
    [events]
  );

  const navigateToScan = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(user)/scan");
  }, [router]);

  const renderMerchant = ({ item, index }: { item: MerchantDisplay; index: number }) => {
    const gradient = GRADIENT_PALETTES[index % GRADIENT_PALETTES.length];
    const eventName = getEventName(item.eventKey);

    return (
      <View style={styles.merchantCard}>
        <View style={styles.merchantRow}>
          {/* Avatar */}
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.merchantAvatar} />
          ) : (
            <LinearGradient colors={gradient} style={styles.merchantAvatar}>
              <Text style={styles.merchantInitial}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}

          {/* Info */}
          <View style={styles.merchantInfo}>
            <Text style={styles.merchantName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.description ? (
              <Text style={styles.merchantDesc} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
            <View style={styles.merchantMeta}>
              <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
              <Text style={styles.merchantEvent} numberOfLines={1}>
                {eventName}
              </Text>
            </View>
          </View>

          {/* Earnings + Pay */}
          <View style={styles.merchantRight}>
            <Text style={styles.merchantEarnings}>
              {formatSOL(item.totalReceived)} SOL
            </Text>
            <TouchableOpacity
              style={styles.payButton}
              onPress={navigateToScan}
              activeOpacity={0.7}
            >
              <Text style={styles.payButtonText}>Pay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
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
                Scan a merchant's QR code to pay instantly with SOL
              </Text>
              {merchantDiscount > 0 && (
                <View style={styles.discountBadge}>
                  <Ionicons name="star" size={12} color={colors.background} />
                  <Text style={styles.discountText}>
                    {merchantDiscount}% loyalty discount
                  </Text>
                </View>
              )}
            </View>
            <Ionicons name="qr-code" size={48} color="rgba(255,255,255,0.3)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search merchants..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Merchant count */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {filteredMerchants.length === 0
            ? "No Merchants"
            : `${filteredMerchants.length} Active Merchant${filteredMerchants.length !== 1 ? "s" : ""}`}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Event Shop</Text>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={navigateToScan}
          activeOpacity={0.7}
        >
          <Ionicons name="qr-code-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredMerchants}
        keyExtractor={(item) => item.publicKey}
        renderItem={renderMerchant}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => fetchMerchants()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="storefront-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={styles.emptyTitle}>
                {search ? "No Results" : "No Merchants Yet"}
              </Text>
              <Text style={styles.emptyMessage}>
                {search
                  ? `No merchants matching "${search}"`
                  : "Merchants registered for events will appear here. Use Scan to Pay to pay at vendor booths."}
              </Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    flexGrow: 1,
  },

  // Scan CTA
  scanCta: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
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
  discountBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    gap: 4,
  },
  discountText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: "#fff",
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
  },

  // Section header
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
  },

  // Merchant card
  merchantCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  merchantRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  merchantAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  merchantInitial: {
    color: "#fff",
    fontSize: 20,
    fontFamily: fonts.heading,
  },
  merchantInfo: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  merchantName: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
  },
  merchantDesc: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 1,
  },
  merchantMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 4,
  },
  merchantEvent: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: colors.textMuted,
    flex: 1,
  },
  merchantRight: {
    alignItems: "flex-end",
  },
  merchantEarnings: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
    marginBottom: 6,
  },
  payButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
  },
  payButtonText: {
    color: colors.background,
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
  },

  // Separator
  separator: {
    height: spacing.sm,
  },

  // Empty state
  emptyContainer: {
    alignItems: "center",
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
