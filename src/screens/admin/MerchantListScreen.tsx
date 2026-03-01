import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";
import { useMerchants } from "../../hooks/useMerchants";
import { useEvents } from "../../hooks/useEvents";
import { useWalletStore } from "../../store/walletStore";
import { useAuthStore } from "../../store/authStore";
import { MerchantDisplay } from "../../types/merchant";
import { formatSOL, shortenAddress } from "../../utils/formatters";
import {
  apiActivateMerchant,
  apiDeactivateMerchant,
} from "../../services/api/merchantApi";
import { showSuccess, showError } from "../../utils/alerts";
import { confirm } from "../../components/ui/ConfirmDialogProvider";

export function MerchantListScreen() {
  const router = useRouter();
  const { eventKey } = useLocalSearchParams<{ eventKey?: string }>();
  const { merchants, fetchMerchants, isLoading } = useMerchants();
  const { events, fetchEvents } = useEvents();
  const publicKey = useWalletStore((s) => s.publicKey);
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = role === "super_admin";
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMerchants();
    fetchEvents();
  }, []);

  const onRefresh = useCallback(async () => {
    await Promise.all([fetchMerchants(), fetchEvents()]);
  }, [fetchMerchants, fetchEvents]);

  // If eventKey is provided, show only merchants for that event
  // Otherwise: SuperAdmin sees all merchants, normal admin sees only merchants for their events
  const myEventKeys = new Set(
    isSuperAdmin
      ? events.map((e) => e.publicKey)
      : events.filter((e) => e.admin === publicKey).map((e) => e.publicKey)
  );

  const filteredMerchants = eventKey
    ? merchants.filter((m) => m.eventKey === eventKey)
    : merchants.filter((m) => myEventKeys.has(m.eventKey));

  const getEventName = (eventKey: string): string => {
    const event = events.find((e) => e.publicKey === eventKey);
    return event?.name ?? shortenAddress(eventKey, 6);
  };

  const handleToggleStatus = async (merchant: MerchantDisplay) => {
    const action = merchant.isActive ? "Deactivate" : "Activate";

    confirm({
      title: `${action} Merchant`,
      message: `${action} "${merchant.name}"?`,
      type: merchant.isActive ? "danger" : "default",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        {
          text: action,
          style: merchant.isActive ? "destructive" : "default",
          onPress: async () => {
            setTogglingId(merchant.publicKey);
            try {
              if (merchant.isActive) {
                await apiDeactivateMerchant({
                  eventPda: merchant.eventKey,
                  merchantAuthority: merchant.authority,
                });
              } else {
                await apiActivateMerchant({
                  eventPda: merchant.eventKey,
                  merchantAuthority: merchant.authority,
                });
              }
              showSuccess("Success", `Merchant ${action.toLowerCase()}d.`);
              await fetchMerchants();
            } catch (error: any) {
              showError("Error", error.message ?? `Failed to ${action.toLowerCase()} merchant`);
            } finally {
              setTogglingId(null);
            }
          },
        },
      ],
    });
  };

  const renderMerchantItem = ({ item }: { item: MerchantDisplay }) => {
    const isToggling = togglingId === item.publicKey;

    return (
      <View style={styles.merchantCard}>
        <View style={styles.cardInner}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.merchantImage}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.cardContent}>
            {/* Merchant Name */}
            <Text style={styles.merchantName} numberOfLines={1}>
              {item.name}
            </Text>

            {/* Description */}
            {item.description ? (
              <Text style={styles.merchantDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            {/* Wallet Address */}
            <View style={styles.infoRow}>
              <Ionicons
                name="wallet-outline"
                size={14}
                color={colors.accent}
              />
              <Text style={styles.infoText}>
                {shortenAddress(item.authority, 6)}
              </Text>
            </View>

            {/* Event */}
            <View style={styles.infoRow}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={colors.secondary}
              />
              <Text style={styles.infoText} numberOfLines={1}>
                {getEventName(item.eventKey)}
              </Text>
            </View>

            {/* Bottom row: total received + status */}
            <View style={styles.bottomRow}>
              <View style={styles.statChip}>
                <Ionicons
                  name="cash-outline"
                  size={13}
                  color={colors.primary}
                />
                <Text style={styles.statText}>
                  {formatSOL(item.totalReceived)} SOL received
                </Text>
              </View>

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
          </View>

          {/* Toggle Button */}
          <TouchableOpacity
            style={[
              styles.toggleButton,
              item.isActive ? styles.deactivateBtn : styles.activateBtn,
            ]}
            onPress={() => handleToggleStatus(item)}
            disabled={isToggling}
            activeOpacity={0.7}
          >
            {isToggling ? (
              <ActivityIndicator
                size="small"
                color={item.isActive ? colors.error : colors.success}
              />
            ) : (
              <Ionicons
                name={item.isActive ? "pause-circle-outline" : "play-circle-outline"}
                size={22}
                color={item.isActive ? colors.error : colors.success}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    const eventName = eventKey ? getEventName(eventKey) : null;
    return (
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Merchants</Text>
            <Text style={styles.headerSubtitle}>
              {eventName && `${eventName} • `}
              {filteredMerchants.length}{" "}
              {filteredMerchants.length === 1 ? "merchant" : "merchants"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.headerCreateButton}
            onPress={() => router.push("/(admin)/register-merchant")}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color={colors.background} />
            <Text style={styles.headerCreateText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading merchants...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons
            name="storefront-outline"
            size={64}
            color={colors.textMuted}
          />
        </View>
        <Text style={styles.emptyTitle}>No merchants yet</Text>
        <Text style={styles.emptySubtitle}>
          Register merchants so they can accept payments at your events.
        </Text>
        <TouchableOpacity
          style={styles.emptyCreateButton}
          onPress={() => router.push("/(admin)/register-merchant")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={colors.background}
          />
          <Text style={styles.emptyCreateText}>Register Merchant</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredMerchants}
        renderItem={renderMerchantItem}
        keyExtractor={(item) => item.publicKey}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
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
  listContent: {
    paddingBottom: 100,
  },

  // Header
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
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

  // Merchant Card
  merchantCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  merchantImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: spacing.sm,
  },
  cardContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  merchantName: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  merchantDescription: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    lineHeight: 18,
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
  toggleButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activateBtn: {
    backgroundColor: "rgba(0, 255, 163, 0.1)",
  },
  deactivateBtn: {
    backgroundColor: "rgba(255, 71, 87, 0.1)",
  },
  separator: {
    height: spacing.sm,
  },

  // Empty State
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
});
