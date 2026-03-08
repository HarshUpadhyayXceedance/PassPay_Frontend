import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { showInfo } from "../../utils/alerts";
import { useLoyalty } from "../../hooks/useLoyalty";
import { apiSetupBadgeCollection } from "../../services/api/eventApi";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";
import { shortenAddress } from "../../utils/formatters";

type SetupStep = "idle" | "creating_mints" | "initializing" | "done" | "error";

export function SetupBadgeCollectionScreen() {
  const router = useRouter();
  const { badgeCollection, fetchBadgeCollection } = useLoyalty();
  const [step, setStep] = useState<SetupStep>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [txSignature, setTxSignature] = useState("");

  useEffect(() => {
    fetchBadgeCollection();
  }, []);

  const isAlreadyInitialized = !!badgeCollection;

  const handleSetup = async () => {
    if (isAlreadyInitialized) {
      showInfo("Already Set Up", "Badge collection is already initialized.");
      return;
    }

    setStep("creating_mints");
    setErrorMsg("");

    try {
      setStep("creating_mints");

      const sig = await apiSetupBadgeCollection();

      setTxSignature(sig);
      setStep("done");


      await fetchBadgeCollection();
    } catch (error: any) {
      setStep("error");
      setErrorMsg(error.message || "Failed to set up badge collection");
    }
  };

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Setup Badges</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >

        <View style={styles.infoCard}>
          <View style={styles.infoIconWrap}>
            <Ionicons name="ribbon" size={32} color={colors.secondary} />
          </View>
          <Text style={styles.infoTitle}>Soulbound Badge NFTs</Text>
          <Text style={styles.infoText}>
            This one-time setup creates 4 SPL token mints (Bronze, Silver, Gold,
            Platinum) and initializes the badge collection on-chain. Users can then
            claim soulbound NFT badges after checking in at events.
          </Text>
        </View>


        {isAlreadyInitialized ? (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <Text style={styles.statusTitle}>Already Initialized</Text>
            </View>
            <View style={styles.mintRow}>
              <Text style={styles.mintLabel}>Collection</Text>
              <Text style={styles.mintValue}>{badgeCollection!.collectionName}</Text>
            </View>
            <View style={styles.mintRow}>
              <Text style={styles.mintLabel}>Symbol</Text>
              <Text style={styles.mintValue}>{badgeCollection!.collectionSymbol}</Text>
            </View>
            <View style={styles.mintRow}>
              <Text style={styles.mintLabel}>Total Issued</Text>
              <Text style={styles.mintValue}>{badgeCollection!.totalIssued}</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.mintsTitle}>Tier Mints</Text>
            {[
              { label: "Bronze", mint: badgeCollection!.bronzeBadgeMint },
              { label: "Silver", mint: badgeCollection!.silverBadgeMint },
              { label: "Gold", mint: badgeCollection!.goldBadgeMint },
              { label: "Platinum", mint: badgeCollection!.platinumBadgeMint },
            ].map(({ label, mint }) => (
              <View key={label} style={styles.mintRow}>
                <Text style={styles.mintLabel}>{label}</Text>
                <Text style={styles.mintValueMono}>
                  {shortenAddress(mint.toBase58(), 6)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <>

            <View style={styles.stepsCard}>
              <Text style={styles.stepsTitle}>Setup Process</Text>
              <StepItem
                number={1}
                label="Create 4 SPL token mints"
                description="Bronze, Silver, Gold, Platinum with badge authority as mint owner"
                isActive={step === "creating_mints"}
                isDone={step === "initializing" || step === "done"}
              />
              <StepItem
                number={2}
                label="Initialize badge collection"
                description="Register mints on-chain and set collection metadata"
                isActive={step === "initializing"}
                isDone={step === "done"}
              />
            </View>


            {step === "creating_mints" && (
              <View style={styles.progressCard}>
                <ActivityIndicator color={colors.secondary} size="small" />
                <Text style={styles.progressText}>
                  Creating mints & initializing collection...
                </Text>
                <Text style={styles.progressHint}>
                  Approve the transactions in Phantom
                </Text>
              </View>
            )}

            {step === "error" && (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle" size={20} color={colors.error} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {step === "done" && (
              <View style={styles.successCard}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <Text style={styles.successTitle}>Setup Complete!</Text>
                <Text style={styles.successText}>
                  Badge collection has been initialized. Users can now claim badges
                  after checking in to events.
                </Text>
                {txSignature && (
                  <Text style={styles.txText}>
                    Tx: {shortenAddress(txSignature, 8)}
                  </Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>


      {!isAlreadyInitialized && step !== "done" && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.setupButton,
              (step === "creating_mints" || step === "initializing") &&
                styles.setupButtonDisabled,
            ]}
            onPress={handleSetup}
            disabled={step === "creating_mints" || step === "initializing"}
            activeOpacity={0.8}
          >
            {step === "creating_mints" || step === "initializing" ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.setupButtonContent}>
                <Ionicons name="rocket" size={18} color="#fff" />
                <Text style={styles.setupButtonText}>
                  {step === "error" ? "Retry Setup" : "Initialize Badge Collection"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function StepItem({
  number,
  label,
  description,
  isActive,
  isDone,
}: {
  number: number;
  label: string;
  description: string;
  isActive: boolean;
  isDone: boolean;
}) {
  return (
    <View style={styles.stepItem}>
      <View
        style={[
          styles.stepCircle,
          isDone && styles.stepCircleDone,
          isActive && styles.stepCircleActive,
        ]}
      >
        {isDone ? (
          <Ionicons name="checkmark" size={14} color="#fff" />
        ) : (
          <Text
            style={[
              styles.stepNumber,
              isActive && styles.stepNumberActive,
            ]}
          >
            {number}
          </Text>
        )}
      </View>
      <View style={styles.stepContent}>
        <Text style={[styles.stepLabel, isDone && styles.stepLabelDone]}>
          {label}
        </Text>
        <Text style={styles.stepDescription}>{description}</Text>
      </View>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  headerSpacer: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  infoIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.secondaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: "center",
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
  },
  statusTitle: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.success,
  },
  mintRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  mintLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  mintValue: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
  mintValueMono: {
    fontSize: 13,
    fontFamily: fonts.mono,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  mintsTitle: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  stepsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  stepsTitle: {
    fontSize: 15,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  stepItem: {
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepCircleDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepCircleActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  stepNumber: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    color: colors.textMuted,
  },
  stepNumberActive: {
    color: "#fff",
  },
  stepContent: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
    marginBottom: 2,
  },
  stepLabelDone: {
    color: colors.success,
  },
  stepDescription: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.secondary + "40",
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  progressText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
  progressHint: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  errorCard: {
    flexDirection: "row",
    backgroundColor: colors.errorLight,
    borderRadius: 12,
    padding: spacing.md,
    gap: 10,
    alignItems: "flex-start",
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.error,
    lineHeight: 18,
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.success + "40",
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  successTitle: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.success,
  },
  successText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  txText: {
    fontSize: 12,
    fontFamily: fonts.mono,
    color: colors.textMuted,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  setupButton: {
    backgroundColor: colors.secondary,
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  setupButtonDisabled: {
    opacity: 0.6,
  },
  setupButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  setupButtonText: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: "#fff",
  },
});
