import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import { useMerchants } from "../../hooks/useMerchants";
import { useLoyalty } from "../../hooks/useLoyalty";
import { useWallet } from "../../hooks/useWallet";
import { usePurchaseStore } from "../../store/purchaseStore";
import { MerchantProductDisplay } from "../../types/merchant";
import { apiBuyProduct } from "../../services/api/eventApi";
import { findMerchantPda, findProductPda, findProductPurchasePda } from "../../solana/pda";
import { PublicKey } from "@solana/web3.js";
import { formatSOL } from "../../utils/formatters";
import { showError } from "../../utils/alerts";
import { confirm } from "../../components/ui/ConfirmDialogProvider";
import { AppHeader } from "../../components/ui/AppHeader";
import { EmptyState } from "../../components/ui/EmptyState";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing, borderRadius } from "../../theme/spacing";

interface PurchaseReceipt {
  productName: string;
  merchantName: string;
  price: number;
  purchaseRecordPda: string;
  timestamp: number;
}

export function MerchantProductsScreen() {
  const router = useRouter();
  const { merchantKey, merchantName, eventKey } = useLocalSearchParams<{
    merchantKey: string;
    merchantName?: string;
    eventKey?: string;
  }>();
  const { merchants, products, fetchProducts, isLoading } = useMerchants();
  const { loyaltyBenefits } = useLoyalty();
  const { publicKey } = useWallet();
  const fetchPurchases = usePurchaseStore((s) => s.fetchPurchases);
  const [buyingProduct, setBuyingProduct] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PurchaseReceipt | null>(null);

  const merchant = merchants.find((m) => m.publicKey === merchantKey);

  useEffect(() => {
    if (merchantKey) fetchProducts(merchantKey);
  }, [merchantKey]);

  const onRefresh = useCallback(async () => {
    if (merchantKey) await fetchProducts(merchantKey);
  }, [merchantKey]);

  const merchantProducts = products.filter(
    (p) => p.merchantKey === merchantKey && p.isAvailable
  );

  const merchantDiscount = loyaltyBenefits?.merchantDiscount ?? 0;

  const handleBuy = async (product: MerchantProductDisplay) => {
    if (!merchant || !eventKey) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const discountedPrice =
      merchantDiscount > 0
        ? product.price * (1 - merchantDiscount / 100)
        : product.price;

    const displayPrice =
      merchantDiscount > 0
        ? `${formatSOL(discountedPrice)} SOL (${merchantDiscount}% discount)`
        : `${formatSOL(product.price)} SOL`;

    confirm({
      title: `Buy ${product.name}?`,
      message: `Pay ${displayPrice} to ${merchant.name}`,
      type: "default",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        {
          text: "Confirm Purchase",
          style: "default",
          onPress: async () => {
            setBuyingProduct(product.publicKey);
            try {
              await apiBuyProduct({
                eventPda: eventKey,
                merchantAuthority: merchant.authority,
                productName: product.name,
                currentTotalSold: product.totalSold,
              });

              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );

              // Compute the purchase record PDA (seeds: product PDA + totalSold before increment)
              const [merchantPda] = findMerchantPda(
                new PublicKey(eventKey),
                new PublicKey(merchant.authority)
              );
              const [productPda] = findProductPda(merchantPda, product.name);
              const [purchaseRecordPda] = findProductPurchasePda(
                productPda,
                product.totalSold
              );

              const receiptData: PurchaseReceipt = {
                productName: product.name,
                merchantName: merchant.name,
                price: discountedPrice,
                purchaseRecordPda: purchaseRecordPda.toBase58(),
                timestamp: Date.now(),
              };
              setReceipt(receiptData);

              // Refresh on-chain purchases
              if (publicKey) fetchPurchases(publicKey);

              fetchProducts(merchantKey);
            } catch (error: any) {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error
              );
              showError("Purchase Failed", error.message ?? "Something went wrong");
            } finally {
              setBuyingProduct(null);
            }
          },
        },
      ],
    });
  };

  const receiptQRData = receipt
    ? JSON.stringify({
        type: "delivery",
        purchaseRecord: receipt.purchaseRecordPda,
        productName: receipt.productName,
        buyer: publicKey,
        merchant: merchant?.authority,
        eventPda: eventKey,
        amount: receipt.price,
        timestamp: receipt.timestamp,
      })
    : "";

  const renderProduct = ({ item }: { item: MerchantProductDisplay }) => {
    const isBuying = buyingProduct === item.publicKey;
    const discountedPrice =
      merchantDiscount > 0
        ? item.price * (1 - merchantDiscount / 100)
        : item.price;

    return (
      <View style={styles.productCard}>
        <View style={styles.productRow}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="cube-outline" size={28} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.description ? (
              <Text style={styles.productDesc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <Text style={styles.productSold}>{item.totalSold} sold</Text>
          </View>
        </View>

        <View style={styles.productFooter}>
          <View>
            {merchantDiscount > 0 && (
              <Text style={styles.originalPrice}>
                {formatSOL(item.price)} SOL
              </Text>
            )}
            <Text style={styles.productPrice}>
              {formatSOL(discountedPrice)} SOL
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.buyButton, isBuying && styles.buyButtonDisabled]}
            onPress={() => handleBuy(item)}
            disabled={isBuying}
            activeOpacity={0.8}
          >
            {isBuying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="cart-outline" size={16} color="#fff" />
                <Text style={styles.buyButtonText}>Buy</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={merchantName ?? "Products"}
        onBack={() => router.back()}
      />
      <FlatList
        data={merchantProducts}
        keyExtractor={(item) => item.publicKey}
        renderItem={renderProduct}
        contentContainerStyle={[
          styles.listContent,
          merchantProducts.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          merchantProducts.length > 0 ? (
            <View style={styles.headerSection}>
              {merchantDiscount > 0 && (
                <View style={styles.discountBanner}>
                  <Ionicons name="star" size={16} color={colors.primary} />
                  <Text style={styles.discountText}>
                    {merchantDiscount}% loyalty discount applied
                  </Text>
                </View>
              )}
              <Text style={styles.countText}>
                {merchantProducts.length} product
                {merchantProducts.length !== 1 ? "s" : ""} available
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="cube-outline"
              title="No Products"
              message="This merchant hasn't listed any products yet."
            />
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Purchase Receipt QR Modal */}
      <Modal
        visible={receipt !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setReceipt(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons
                name="checkmark-circle"
                size={48}
                color={colors.success}
              />
              <Text style={styles.modalTitle}>Purchase Complete!</Text>
              <Text style={styles.modalSubtitle}>
                Show this QR code to the merchant to collect your item
              </Text>
            </View>

            <View style={styles.qrContainer}>
              {receiptQRData ? (
                <QRCode
                  value={receiptQRData}
                  size={200}
                  backgroundColor="#FFFFFF"
                  color="#000000"
                />
              ) : null}
            </View>

            {receipt && (
              <View style={styles.receiptDetails}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Product</Text>
                  <Text style={styles.receiptValue}>{receipt.productName}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Merchant</Text>
                  <Text style={styles.receiptValue}>
                    {receipt.merchantName}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Paid</Text>
                  <Text style={styles.receiptValueGreen}>
                    {formatSOL(receipt.price)} SOL
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.qrNote}>
              This QR code is your proof of purchase. The merchant will scan it
              to confirm delivery.
            </Text>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setReceipt(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.doneButtonText}>Done</Text>
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
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  productImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  productName: {
    fontSize: 16,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    marginBottom: 2,
  },
  productDesc: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  productSold: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  productFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  originalPrice: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
    textDecorationLine: "line-through",
  },
  productPrice: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.primary,
  },
  buyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.secondary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
  },
  buyButtonDisabled: {
    opacity: 0.5,
  },
  buyButtonText: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: "#fff",
  },
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
  modalHeader: {
    alignItems: "center",
    marginBottom: spacing.lg,
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
  qrNote: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
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
});
