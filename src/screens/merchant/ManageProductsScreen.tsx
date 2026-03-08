import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMerchants } from "../../hooks/useMerchants";
import { useWalletStore } from "../../store/walletStore";
import { MerchantProductDisplay } from "../../types/merchant";
import { apiUpdateProduct } from "../../services/api/eventApi";
import { formatSOL } from "../../utils/formatters";
import { AppHeader } from "../../components/ui/AppHeader";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing, borderRadius } from "../../theme/spacing";
import { showError } from "../../utils/alerts";
import { confirm } from "../../components/ui/ConfirmDialogProvider";

export function ManageProductsScreen() {
  const router = useRouter();
  const { eventKey, merchantKey } = useLocalSearchParams<{
    eventKey?: string;
    merchantKey?: string;
  }>();
  const publicKey = useWalletStore((s) => s.publicKey);
  const { merchants, products, fetchMerchants, fetchProducts, isLoading } =
    useMerchants();


  const myMerchant = merchantKey
    ? merchants.find((m) => m.publicKey === merchantKey)
    : merchants.find((m) => m.authority === publicKey);

  const resolvedEventKey = eventKey || myMerchant?.eventKey;

  useFocusEffect(
    useCallback(() => {
      fetchMerchants();
    }, [])
  );

  useEffect(() => {
    if (myMerchant) fetchProducts(myMerchant.publicKey);
  }, [myMerchant?.publicKey]);

  const myProducts = products.filter(
    (p) => p.merchantKey === myMerchant?.publicKey
  );

  const toggleAvailability = (product: MerchantProductDisplay) => {
    if (!myMerchant || !resolvedEventKey) return;

    const newStatus = !product.isAvailable;
    confirm({
      title: newStatus ? "Make Available" : "Make Unavailable",
      message: `${newStatus ? "Enable" : "Disable"} "${product.name}"?`,
      type: "default",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        {
          text: "Confirm",
          style: "default",
          onPress: async () => {
            try {
              await apiUpdateProduct({
                eventPda: resolvedEventKey,
                productName: product.name,
                isAvailable: newStatus,
              });
              fetchProducts(myMerchant.publicKey);
            } catch (error: any) {
              showError("Error", error.message ?? "Failed to update product");
            }
          },
        },
      ],
    });
  };

  const renderProduct = ({ item }: { item: MerchantProductDisplay }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={styles.productNameRow}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <View
            style={[
              styles.statusDot,
              item.isAvailable ? styles.statusActive : styles.statusInactive,
            ]}
          />
        </View>
        <Text style={styles.productPrice}>{formatSOL(item.price)} SOL</Text>
      </View>

      {item.description ? (
        <Text style={styles.productDesc} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      <View style={styles.productFooter}>
        <Text style={styles.soldCount}>{item.totalSold} sold</Text>

        <View style={styles.productActions}>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => toggleAvailability(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={item.isAvailable ? "pause-circle" : "play-circle"}
              size={20}
              color={item.isAvailable ? colors.warning : colors.primary}
            />
            <Text
              style={[
                styles.toggleText,
                { color: item.isAvailable ? colors.warning : colors.primary },
              ]}
            >
              {item.isAvailable ? "Disable" : "Enable"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (!myMerchant) {
    return (
      <View style={styles.container}>
        <AppHeader title="My Products" onBack={() => router.back()} />
        <View style={styles.emptyContainer}>
          <Ionicons
            name="storefront-outline"
            size={48}
            color={colors.textMuted}
          />
          <Text style={styles.emptyTitle}>Not a Merchant</Text>
          <Text style={styles.emptyMessage}>
            You are not registered as a merchant. Contact an event admin to get
            registered.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="My Products"
        onBack={() => router.back()}
        rightAction={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() =>
              router.push({
                pathname: "/(merchant)/add-product",
                params: {
                  eventKey: resolvedEventKey!,
                  merchantKey: myMerchant.publicKey,
                },
              })
            }
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={myProducts}
        keyExtractor={(item) => item.publicKey}
        renderItem={renderProduct}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              fetchMerchants();
              if (myMerchant) fetchProducts(myMerchant.publicKey);
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="cube-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={styles.emptyTitle}>No Products Yet</Text>
              <Text style={styles.emptyMessage}>
                Add your first product to start selling at events.
              </Text>
              <TouchableOpacity
                style={styles.addFirstButton}
                onPress={() =>
                  router.push({
                    pathname: "/(merchant)/add-product",
                    params: {
                      eventKey: resolvedEventKey!,
                      merchantKey: myMerchant.publicKey,
                    },
                  })
                }
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={20} color={colors.primary} />
                <Text style={styles.addFirstText}>Add Product</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  addButton: {
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
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  productNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
    marginRight: spacing.sm,
  },
  productName: {
    fontSize: 16,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: "#2ED573",
  },
  statusInactive: {
    backgroundColor: colors.textMuted,
  },
  productPrice: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.primary,
  },
  productDesc: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  soldCount: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  productActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  toggleText: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
  },
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
  addFirstButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryMuted,
  },
  addFirstText: {
    fontSize: 15,
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },
});
