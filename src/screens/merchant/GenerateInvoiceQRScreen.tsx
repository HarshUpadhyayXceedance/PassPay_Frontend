import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../components/ui/AppInput";
import { AppButton } from "../../components/ui/AppButton";
import { QRPreview } from "../../components/qr/QRPreview";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { fonts } from "../../theme/fonts";
import { spacing, borderRadius } from "../../theme/spacing";
import { useWalletStore } from "../../store/walletStore";
import { useMerchants } from "../../hooks/useMerchants";
import { encodeQRPayload } from "../../utils/qrPayload";
import { validateAmount } from "../../utils/validators";
import { formatSOL } from "../../utils/formatters";
import { MerchantProductDisplay } from "../../types/merchant";

export function GenerateInvoiceQRScreen() {
  const { eventKey: paramEventKey, merchantKey: paramMerchantKey } =
    useLocalSearchParams<{ eventKey?: string; merchantKey?: string }>();
  const publicKey = useWalletStore((s) => s.publicKey);
  const { merchants, products, fetchMerchants, fetchProducts } = useMerchants();

  useEffect(() => {
    fetchMerchants();
  }, []);

  // If params provided, use them. Otherwise find first merchant for this wallet.
  const myMerchant = paramMerchantKey
    ? merchants.find((m) => m.publicKey === paramMerchantKey)
    : merchants.find((m) => m.authority === publicKey);

  useEffect(() => {
    if (myMerchant) fetchProducts(myMerchant.publicKey);
  }, [myMerchant?.publicKey]);

  const myProducts = products.filter(
    (p) => p.merchantKey === myMerchant?.publicKey && p.isAvailable
  );

  const [amount, setAmount] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState<MerchantProductDisplay | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelectProduct = (product: MerchantProductDisplay) => {
    if (selectedProduct?.publicKey === product.publicKey) {
      setSelectedProduct(null);
      setAmount("");
    } else {
      setSelectedProduct(product);
      setAmount(formatSOL(product.price));
    }
    setQrData(null);
  };

  const handleGenerate = () => {
    const err = validateAmount(amount);
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    if (!myMerchant || !publicKey) {
      setError("Merchant not found");
      return;
    }

    const resolvedEventKey = paramEventKey || myMerchant.eventKey;
    const payload = encodeQRPayload({
      type: "payment",
      merchantAuthority: publicKey,
      eventKey: resolvedEventKey,
      amount: parseFloat(amount),
      ...(selectedProduct ? { productName: selectedProduct.name } : {}),
    });

    setQrData(payload);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Generate Payment QR</Text>

      {!myMerchant ? (
        <Text style={styles.emptyText}>
          You are not registered as a merchant for any event.
        </Text>
      ) : (
        <>
          <Text style={styles.merchantName}>{myMerchant.name}</Text>

          {/* Product selector */}
          {myProducts.length > 0 && (
            <View style={styles.productSection}>
              <Text style={styles.productLabel}>
                SELECT PRODUCT (OPTIONAL)
              </Text>
              {myProducts.map((p) => {
                const isSelected =
                  selectedProduct?.publicKey === p.publicKey;
                return (
                  <TouchableOpacity
                    key={p.publicKey}
                    style={[
                      styles.productOption,
                      isSelected && styles.productOptionSelected,
                    ]}
                    onPress={() => handleSelectProduct(p)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.productOptionInfo}>
                      <Text
                        style={[
                          styles.productOptionName,
                          isSelected && styles.productOptionNameSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {p.name}
                      </Text>
                      <Text style={styles.productOptionPrice}>
                        {formatSOL(p.price)} SOL
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <AppInput
            label="Amount (SOL)"
            value={amount}
            onChangeText={(text) => {
              setAmount(text);
              setQrData(null);
              if (selectedProduct) setSelectedProduct(null);
            }}
            placeholder="0.05"
            keyboardType="decimal-pad"
            error={error ?? undefined}
          />

          <AppButton
            title="Generate QR"
            onPress={handleGenerate}
            style={styles.generateButton}
          />

          {qrData && (
            <View style={styles.qrContainer}>
              <QRPreview
                data={qrData}
                title={
                  selectedProduct
                    ? `${selectedProduct.name} — ${amount} SOL`
                    : `${amount} SOL`
                }
                subtitle="Show this to the customer"
                size={220}
              />
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  merchantName: {
    ...typography.bodyBold,
    color: colors.secondary,
    marginBottom: spacing.lg,
  },
  generateButton: {
    marginTop: spacing.sm,
  },
  qrContainer: {
    marginTop: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xxl,
  },
  productSection: {
    marginBottom: spacing.md,
  },
  productLabel: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  productOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  productOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  productOptionInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  productOptionName: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
  productOptionNameSelected: {
    color: colors.primary,
  },
  productOptionPrice: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
    marginTop: 2,
  },
});
