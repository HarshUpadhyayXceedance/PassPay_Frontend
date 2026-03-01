import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Slider from "@react-native-community/slider";
import { PublicKey } from "@solana/web3.js";
import { AppButton } from "../../components/ui/AppButton";
import { AppCard } from "../../components/ui/AppCard";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";
import { useWallet } from "../../hooks/useWallet";
import { enableDynamicPricing } from "../../solana/actions/enableDynamicPricing";
import { formatSOL, solToLamports } from "../../utils/formatters";
import { SeatTierDisplay } from "../../types/merchant";
import { showSuccess, showError } from "../../utils/alerts";

interface DynamicPricingSetupModalProps {
  eventPubkey: string;
  basePrice: number; // SOL (cheapest tier price)
  tiers?: SeatTierDisplay[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

const INTERVAL_OPTIONS = [
  { label: "1 Hour", value: 3600 },
  { label: "6 Hours", value: 21600 },
  { label: "12 Hours", value: 43200 },
  { label: "24 Hours", value: 86400 },
];

export function DynamicPricingSetupModal({
  eventPubkey,
  basePrice,
  tiers,
  onSuccess,
  onCancel,
}: DynamicPricingSetupModalProps) {
  const { publicKey } = useWallet();

  const [minPricePct, setMinPricePct] = useState(50);
  const [maxPricePct, setMaxPricePct] = useState(200);
  const [demandFactor, setDemandFactor] = useState(50);
  const [timeFactor, setTimeFactor] = useState(30);
  const [scarcityPremium, setScarcityPremium] = useState(50);
  const [intervalIndex, setIntervalIndex] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const minPrice = basePrice * (minPricePct / 100);
  const maxPrice = basePrice * (maxPricePct / 100);

  // Preview: at max multiplier, how would each tier be affected?
  const maxMultiplier = maxPricePct / 100;

  const handleEnable = async () => {
    if (!publicKey) {
      showError("Error", "Wallet not connected");
      return;
    }

    setIsSubmitting(true);
    try {
      const adminPubkey = new PublicKey(publicKey);
      const eventKey = new PublicKey(eventPubkey);

      await enableDynamicPricing(adminPubkey, eventKey, {
        minPrice: solToLamports(minPrice),
        maxPrice: solToLamports(maxPrice),
        demandFactor,
        timeFactor,
        scarcityPremium,
        updateInterval: INTERVAL_OPTIONS[intervalIndex].value,
      });

      showSuccess("Success", "Dynamic pricing enabled for this event!");
      onSuccess?.();
    } catch (error: any) {
      showError("Error", error.message || "Failed to enable dynamic pricing");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Dynamic Pricing</Text>
        <Text style={styles.subtitle}>
          Prices adjust automatically based on demand, time, and scarcity.
          The multiplier applies proportionally to all seat tiers.
        </Text>

        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Price Range</Text>
          <Text style={styles.sectionHint}>
            Set the min/max multiplier range relative to base tier prices
          </Text>

          <SliderRow
            label="Min Multiplier"
            value={minPricePct}
            min={30}
            max={100}
            suffix="%"
            displayValue={`${minPricePct}% (${formatSOL(minPrice)} SOL)`}
            onChange={setMinPricePct}
          />

          <SliderRow
            label="Max Multiplier"
            value={maxPricePct}
            min={100}
            max={500}
            suffix="%"
            displayValue={`${maxPricePct}% (${formatSOL(maxPrice)} SOL)`}
            onChange={setMaxPricePct}
          />
        </AppCard>

        {/* Tier Impact Preview */}
        {tiers && tiers.length > 0 && (
          <AppCard style={styles.card}>
            <Text style={styles.sectionTitle}>Tier Impact Preview</Text>
            <Text style={styles.sectionHint}>
              At max multiplier ({maxMultiplier.toFixed(1)}x), tier prices would be:
            </Text>
            {tiers.map((tier) => (
              <View key={tier.publicKey} style={styles.tierPreviewRow}>
                <Text style={styles.tierPreviewName}>{tier.name}</Text>
                <Text style={styles.tierPreviewPrice}>
                  {formatSOL(tier.price)} → {formatSOL(tier.price * maxMultiplier)} SOL
                </Text>
              </View>
            ))}
          </AppCard>
        )}

        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Update Interval</Text>
          <View style={styles.intervalRow}>
            {INTERVAL_OPTIONS.map((opt, i) => (
              <AppButton
                key={opt.value}
                title={opt.label}
                variant="outline"
                selected={i === intervalIndex}
                size="sm"
                onPress={() => setIntervalIndex(i)}
                style={styles.intervalBtn}
              />
            ))}
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Factors</Text>

          <SliderRow
            label="Demand Factor"
            value={demandFactor}
            min={0}
            max={100}
            onChange={setDemandFactor}
          />

          <SliderRow
            label="Time Factor"
            value={timeFactor}
            min={0}
            max={100}
            onChange={setTimeFactor}
          />

          <SliderRow
            label="Scarcity Premium"
            value={scarcityPremium}
            min={0}
            max={100}
            onChange={setScarcityPremium}
          />
        </AppCard>

        <View style={styles.actions}>
          <AppButton
            title="Cancel"
            variant="outline"
            onPress={() => onCancel?.()}
            style={styles.cancelBtn}
          />
          <AppButton
            title={isSubmitting ? "Enabling..." : "Enable Pricing"}
            onPress={handleEnable}
            loading={isSubmitting}
            style={styles.submitBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  suffix,
  displayValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  displayValue?: string;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>
          {displayValue ?? `${Math.round(value)}${suffix ?? ""}`}
        </Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        value={value}
        onValueChange={(v) => onChange(Math.round(v))}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  sliderRow: {
    marginBottom: spacing.md,
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  sliderLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  sliderValue: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.primary,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  intervalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  intervalBtn: {
    flex: 1,
    minWidth: "40%",
  },
  tierPreviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tierPreviewName: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
  tierPreviewPrice: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 2,
  },
});
