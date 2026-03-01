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
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useMerchants } from "../../hooks/useMerchants";
import { useLoyalty } from "../../hooks/useLoyalty";
import { MerchantDisplay } from "../../types/merchant";
import { formatSOL } from "../../utils/formatters";
import { AppHeader } from "../../components/ui/AppHeader";
import { EmptyState } from "../../components/ui/EmptyState";
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

export function EventMerchantsScreen() {
  const router = useRouter();
  const { eventKey, eventName } = useLocalSearchParams<{
    eventKey: string;
    eventName?: string;
  }>();
  const { merchants, products, fetchMerchants, fetchProducts, isLoading } =
    useMerchants();
  const { loyaltyBenefits } = useLoyalty();

  useEffect(() => {
    fetchMerchants();
  }, []);

  // Fetch products for all merchants of this event
  useEffect(() => {
    const eventMerchants = merchants.filter(
      (m) => m.eventKey === eventKey && m.isActive
    );
    eventMerchants.forEach((m) => fetchProducts(m.publicKey));
  }, [merchants.length, eventKey]);

  const onRefresh = useCallback(async () => {
    await fetchMerchants();
  }, []);

  const eventMerchants = merchants.filter(
    (m) => m.eventKey === eventKey && m.isActive
  );

  const merchantDiscount = loyaltyBenefits?.merchantDiscount ?? 0;

  const renderMerchant = ({
    item,
    index,
  }: {
    item: MerchantDisplay;
    index: number;
  }) => {
    const gradient = GRADIENT_PALETTES[index % GRADIENT_PALETTES.length];
    const merchantProducts = products.filter(
      (p) => p.merchantKey === item.publicKey && p.isAvailable
    );

    return (
      <TouchableOpacity
        style={styles.merchantCard}
        activeOpacity={0.8}
        onPress={() => {
          router.push({
            pathname: "/(user)/merchant-products",
            params: {
              merchantKey: item.publicKey,
              merchantName: item.name,
              eventKey: eventKey,
            },
          });
        }}
      >
        <View style={styles.merchantRow}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.merchantAvatar} />
          ) : (
            <LinearGradient colors={gradient} style={styles.merchantAvatar}>
              <Text style={styles.merchantInitial}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}
          <View style={styles.merchantInfo}>
            <Text style={styles.merchantName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.description ? (
              <Text style={styles.merchantDesc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <View style={styles.merchantStats}>
              <View style={styles.statBadge}>
                <Ionicons name="cube-outline" size={12} color={colors.primary} />
                <Text style={styles.statText}>
                  {merchantProducts.length} product
                  {merchantProducts.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <View style={styles.statBadge}>
                <Ionicons name="cash-outline" size={12} color={colors.secondary} />
                <Text style={styles.statText}>
                  {formatSOL(item.totalReceived)} SOL earned
                </Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={eventName ?? "Merchants"}
        onBack={() => router.back()}
      />
      <FlatList
        data={eventMerchants}
        keyExtractor={(item) => item.publicKey}
        renderItem={renderMerchant}
        contentContainerStyle={[
          styles.listContent,
          eventMerchants.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          eventMerchants.length > 0 ? (
            <View style={styles.headerSection}>
              {merchantDiscount > 0 && (
                <View style={styles.discountBanner}>
                  <Ionicons name="star" size={16} color={colors.primary} />
                  <Text style={styles.discountText}>
                    {merchantDiscount}% loyalty discount on all purchases
                  </Text>
                </View>
              )}
              <Text style={styles.countText}>
                {eventMerchants.length} merchant
                {eventMerchants.length !== 1 ? "s" : ""} at this event
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="storefront-outline"
              title="No Merchants"
              message="No merchants have been registered for this event yet."
            />
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
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  headerSection: {
    marginBottom: spacing.md,
  },
  discountBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryMuted,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  discountText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },
  countText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  merchantCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  merchantRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  merchantAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
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
    fontSize: 16,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    marginBottom: 2,
  },
  merchantDesc: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 18,
  },
  merchantStats: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statText: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
  },
});
