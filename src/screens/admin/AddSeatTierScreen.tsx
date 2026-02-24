import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";
import { AppHeader } from "../../components/ui/AppHeader";
import { useMerchants } from "../../hooks/useMerchants";
import { apiAddSeatTier } from "../../services/api/eventApi";
import { formatSOL } from "../../utils/formatters";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";

const TIER_PRESETS = [
  { name: "Bronze", level: 0 },
  { name: "Silver", level: 1 },
  { name: "Gold", level: 2 },
  { name: "VIP", level: 3 },
];

export function AddSeatTierScreen() {
  const router = useRouter();
  const { eventKey, eventName } = useLocalSearchParams<{
    eventKey: string;
    eventName?: string;
  }>();
  const { seatTiers, fetchSeatTiers } = useMerchants();

  const [tierName, setTierName] = useState("");
  const [price, setPrice] = useState("");
  const [totalSeats, setTotalSeats] = useState("");
  const [tierLevel, setTierLevel] = useState(0);
  const [isRestricted, setIsRestricted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // Fetch existing tiers for this event
  useFocusEffect(
    useCallback(() => {
      if (eventKey) fetchSeatTiers(eventKey);
      setTierName("");
      setPrice("");
      setTotalSeats("");
      setTierLevel(0);
      setIsRestricted(false);
      setErrors({});
      setCreating(false);
    }, [eventKey])
  );

  const eventTiers = seatTiers.filter((t) => t.eventKey === eventKey);

  const validate = (): boolean => {
    const newErrors: Record<string, string | null> = {
      tierName:
        !tierName.trim()
          ? "Tier name is required"
          : tierName.length > 32
          ? "Max 32 characters"
          : null,
      price:
        !price.trim()
          ? "Price is required"
          : isNaN(parseFloat(price)) || parseFloat(price) <= 0
          ? "Must be a positive number"
          : null,
      totalSeats:
        !totalSeats.trim()
          ? "Total seats is required"
          : isNaN(parseInt(totalSeats, 10)) || parseInt(totalSeats, 10) <= 0
          ? "Must be a positive integer"
          : null,
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleCreate = async () => {
    if (!validate() || !eventKey) return;

    setCreating(true);
    try {
      await apiAddSeatTier({
        eventPda: eventKey,
        name: tierName.trim(),
        price: Math.round(parseFloat(price) * 1_000_000_000), // SOL → lamports
        totalSeats: parseInt(totalSeats, 10),
        tierLevel,
        isRestricted,
      });

      Alert.alert(
        "Tier Added",
        `"${tierName}" tier has been created with ${totalSeats} seats at ${price} SOL each.`,
        [
          {
            text: "Add Another",
            onPress: () => {
              setTierName("");
              setPrice("");
              setTotalSeats("");
              setTierLevel(Math.min(tierLevel + 1, 3));
              setIsRestricted(false);
              setErrors({});
              fetchSeatTiers(eventKey);
            },
          },
          { text: "Done", onPress: () => router.back() },
        ]
      );
    } catch (error: any) {
      const msg = error.message ?? "Failed to add tier";
      if (msg.includes("already in use")) {
        Alert.alert("Tier Exists", `A tier named "${tierName}" already exists for this event.`);
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setCreating(false);
    }
  };

  const applyPreset = (preset: (typeof TIER_PRESETS)[number]) => {
    setTierName(preset.name);
    setTierLevel(preset.level);
    setIsRestricted(preset.level === 3); // VIP is restricted by default
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Add Seat Tier"
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {eventName && (
          <Text style={styles.eventLabel}>{eventName}</Text>
        )}

        {/* Existing tiers summary */}
        {eventTiers.length > 0 && (
          <View style={styles.existingSection}>
            <Text style={styles.existingTitle}>
              Existing Tiers ({eventTiers.length})
            </Text>
            {eventTiers.map((t) => (
              <View key={t.publicKey} style={styles.existingTier}>
                <Text style={styles.existingName}>{t.name}</Text>
                <Text style={styles.existingInfo}>
                  {formatSOL(t.price)} SOL · {t.totalSeats} seats
                  {t.isRestricted ? " · VIP Only" : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Tier presets */}
        <Text style={styles.sectionLabel}>QUICK PRESETS</Text>
        <View style={styles.presetsRow}>
          {TIER_PRESETS.map((preset) => {
            const alreadyExists = eventTiers.some(
              (t) => t.name.toLowerCase() === preset.name.toLowerCase()
            );
            return (
              <AppButton
                key={preset.name}
                title={preset.name}
                variant={tierName === preset.name ? "primary" : "outline"}
                size="sm"
                onPress={() => applyPreset(preset)}
                disabled={alreadyExists}
                style={alreadyExists ? { ...styles.presetButton, ...styles.presetDisabled } : styles.presetButton}
              />
            );
          })}
        </View>

        {/* Form */}
        <AppInput
          label="Tier Name"
          value={tierName}
          onChangeText={setTierName}
          placeholder="e.g. Bronze, Silver, Gold, VIP"
          error={errors.tierName ?? undefined}
          maxLength={32}
        />

        <AppInput
          label="Price (SOL)"
          value={price}
          onChangeText={setPrice}
          placeholder="0.05"
          keyboardType="decimal-pad"
          error={errors.price ?? undefined}
        />

        <AppInput
          label="Total Seats"
          value={totalSeats}
          onChangeText={setTotalSeats}
          placeholder="50"
          keyboardType="number-pad"
          error={errors.totalSeats ?? undefined}
        />

        {/* Tier level */}
        <View style={styles.levelSection}>
          <Text style={styles.levelLabel}>Tier Level</Text>
          <View style={styles.levelRow}>
            {[0, 1, 2, 3].map((level) => (
              <AppButton
                key={level}
                title={TIER_PRESETS[level].name}
                variant={tierLevel === level ? "primary" : "outline"}
                size="sm"
                onPress={() => setTierLevel(level)}
                style={styles.levelButton}
              />
            ))}
          </View>
          <Text style={styles.levelHint}>
            Higher tiers display first in the ticket purchase flow
          </Text>
        </View>

        {/* VIP Restriction toggle */}
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>VIP Restriction</Text>
            <Text style={styles.switchHint}>
              Only Gold/Platinum badge holders can purchase
            </Text>
          </View>
          <Switch
            value={isRestricted}
            onValueChange={setIsRestricted}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={isRestricted ? "#fff" : colors.textMuted}
          />
        </View>

        <AppButton
          title="Add Seat Tier"
          onPress={handleCreate}
          loading={creating}
          size="lg"
          style={styles.createButton}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  eventLabel: {
    fontSize: 16,
    fontFamily: fonts.headingSemiBold,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  existingSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  existingTitle: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  existingTier: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  existingName: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
  existingInfo: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  presetsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    flexWrap: "wrap",
  },
  presetButton: {
    flex: 1,
    minWidth: 70,
  },
  presetDisabled: {
    opacity: 0.3,
  },
  levelSection: {
    marginBottom: spacing.md,
  },
  levelLabel: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  levelRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  levelButton: {
    flex: 1,
  },
  levelHint: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  switchInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchLabel: {
    fontSize: 15,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
  switchHint: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
    marginTop: 2,
  },
  createButton: {
    marginTop: spacing.sm,
  },
});
