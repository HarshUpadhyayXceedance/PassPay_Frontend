import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import QRCode from "react-native-qrcode-svg";
import { useTickets } from "../../hooks/useTickets";
import { useEvents } from "../../hooks/useEvents";
import { useMerchants } from "../../hooks/useMerchants";
import { usePurchaseStore, PurchaseReceipt } from "../../store/purchaseStore";
import { EventDisplay } from "../../types/event";
import { formatSOL, shortenAddress } from "../../utils/formatters";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing, borderRadius } from "../../theme/spacing";

const REDEEMED_PURCHASES_KEY = "redeemed_purchases";

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
  const { purchases, loadPurchases, isLoaded: purchasesLoaded } = usePurchaseStore();
  const [selectedReceipt, setSelectedReceipt] = useState<PurchaseReceipt | null>(null);
  const [isReceiptUsed, setIsReceiptUsed] = useState(false);

  // Check if a purchase ID has been redeemed
  const checkIfRedeemed = useCallback(async (purchaseId: string): Promise<boolean> => {
    try {
      const stored = await AsyncStorage.getItem(REDEEMED_PURCHASES_KEY);
      if (!stored) return false;
      const redeemedSet = new Set<string>(JSON.parse(stored));
      return redeemedSet.has(purchaseId);
    } catch (error) {
      console.error("Error checking redemption status:", error);
      return false;
    }
  }, []);

  // Check redemption status when receipt is selected
  useEffect(() => {
    if (selectedReceipt) {
      checkIfRedeemed(selectedReceipt.id).then(setIsReceiptUsed);
    } else {
      setIsReceiptUsed(false);
    }
  }, [selectedReceipt, checkIfRedeemed]);

  useEffect(() => {
    fetchMyTickets();
    fetchEvents();
    fetchMerchants();
    loadPurchases();
  }, []);

  const isLoading = ticketsLoading || eventsLoading;

  const onRefresh = useCallback(async () => {
    await Promise.all([fetchMyTickets(), fetchEvents(), fetchMerchants(), loadPurchases()]);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(user)/scan");
  }, [router]);

  const getReceiptQR = (receipt: PurchaseReceipt) =>
    JSON.stringify({
      type: "delivery",
      purchaseId: receipt.id,
      productName: receipt.productName,
      buyer: receipt.buyer,
      merchant: receipt.merchantAuthority,
      amount: receipt.amount,
      timestamp: receipt.timestamp,
      txSignature: receipt.txSignature,
    });

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
          myEvents.length === 0 && purchases.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
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

            {/* My Purchases Section */}
            {purchases.length > 0 && (
              <View style={styles.purchasesSection}>
                <Text style={styles.sectionTitle}>
                  My Purchases ({purchases.length})
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Show the QR code to the merchant to collect your item
                </Text>
                {purchases.slice(0, 10).map((purchase) => {
                  const eventName = events.find(
                    (e) => e.publicKey === purchase.eventKey
                  )?.name;
                  const dateStr = new Date(purchase.timestamp).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                  );
                  return (
                    <TouchableOpacity
                      key={purchase.id}
                      style={styles.purchaseCard}
                      activeOpacity={0.7}
                      onPress={() => setSelectedReceipt(purchase)}
                    >
                      <View style={styles.purchaseIconWrap}>
                        <Ionicons name="receipt-outline" size={20} color={colors.secondary} />
                      </View>
                      <View style={styles.purchaseInfo}>
                        <Text style={styles.purchaseProduct} numberOfLines={1}>
                          {purchase.productName}
                        </Text>
                        <Text style={styles.purchaseMeta} numberOfLines={1}>
                          {eventName ?? shortenAddress(purchase.merchantAuthority)} · {dateStr}
                        </Text>
                      </View>
                      <View style={styles.purchaseRight}>
                        <Text style={styles.purchaseAmount}>
                          {formatSOL(purchase.amount)} SOL
                        </Text>
                        <Ionicons name="qr-code-outline" size={16} color={colors.primary} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {myEvents.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>
                  Your Events ({myEvents.length})
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Browse merchants and products at events you have tickets for
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !isLoading && myEvents.length === 0 && purchases.length === 0 ? (
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

      {/* Receipt QR Modal */}
      <Modal
        visible={selectedReceipt !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReceipt(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSelectedReceipt(null)}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <Ionicons name="receipt" size={36} color={colors.secondary} />
            <Text style={styles.modalTitle}>Purchase Receipt</Text>
            <Text style={styles.modalSubtitle}>
              Show this QR to the merchant to collect your item
            </Text>

            {/* Status Badge */}
            <View style={[
              styles.statusBadge,
              isReceiptUsed ? styles.statusBadgeUsed : styles.statusBadgeValid
            ]}>
              <Ionicons
                name={isReceiptUsed ? "ban" : "checkmark-circle"}
                size={16}
                color={isReceiptUsed ? colors.error : colors.success}
              />
              <Text style={[
                styles.statusBadgeText,
                { color: isReceiptUsed ? colors.error : colors.success }
              ]}>
                {isReceiptUsed ? "USED" : "VALID"}
              </Text>
            </View>

            <View style={styles.qrContainer}>
              {selectedReceipt && (
                <QRCode
                  value={getReceiptQR(selectedReceipt)}
                  size={200}
                  backgroundColor="#FFFFFF"
                  color="#000000"
                />
              )}
            </View>

            {selectedReceipt && (
              <View style={styles.receiptDetails}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Product</Text>
                  <Text style={styles.receiptValue}>{selectedReceipt.productName}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Amount</Text>
                  <Text style={styles.receiptValueGreen}>
                    {formatSOL(selectedReceipt.amount)} SOL
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Date</Text>
                  <Text style={styles.receiptValue}>
                    {new Date(selectedReceipt.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setSelectedReceipt(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.doneButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  // ── Purchases Section ──────────────────────────────────
  purchasesSection: {
    marginBottom: spacing.lg,
  },
  purchaseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  purchaseIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.secondaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  purchaseInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  purchaseProduct: {
    fontSize: 14,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    marginBottom: 2,
  },
  purchaseMeta: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  purchaseRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  purchaseAmount: {
    fontSize: 14,
    fontFamily: fonts.heading,
    color: colors.secondary,
  },

  // ── Receipt Modal ──────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: 40,
    alignItems: "center",
  },
  modalClose: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: fonts.heading,
    color: colors.text,
    marginTop: spacing.sm,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  qrContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: spacing.lg,
  },
  receiptDetails: {
    width: "100%",
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  receiptLabel: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  receiptValue: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
  receiptValueGreen: {
    fontSize: 14,
    fontFamily: fonts.heading,
    color: colors.secondary,
  },
  doneButton: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  doneButtonText: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: "#fff",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  statusBadgeValid: {
    backgroundColor: colors.success + "18",
    borderColor: colors.success,
  },
  statusBadgeUsed: {
    backgroundColor: colors.error + "18",
    borderColor: colors.error,
  },
  statusBadgeText: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 1.2,
  },
});
