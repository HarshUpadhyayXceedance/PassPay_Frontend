import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { PublicKey } from "@solana/web3.js";
import { AppInput } from "../../components/ui/AppInput";
import { AppButton } from "../../components/ui/AppButton";
import { AppCard } from "../../components/ui/AppCard";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { useWallet } from "../../hooks/useWallet";
import { initializeBadgeCollection } from "../../solana/actions/initializeBadgeCollection";

export function InitializeBadgeCollectionScreen() {
  const router = useRouter();
  const { publicKey } = useWallet();

  const [collectionName, setCollectionName] = useState("PassPay Loyalty Badges");
  const [collectionSymbol, setCollectionSymbol] = useState("PPBADGE");
  const [collectionUri, setCollectionUri] = useState("");
  const [bronzeMint, setBronzeMint] = useState("");
  const [silverMint, setSilverMint] = useState("");
  const [goldMint, setGoldMint] = useState("");
  const [platinumMint, setPlatinumMint] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateInputs = (): boolean => {
    if (!collectionName.trim()) {
      Alert.alert("Error", "Collection name is required");
      return false;
    }

    if (!collectionSymbol.trim()) {
      Alert.alert("Error", "Collection symbol is required");
      return false;
    }

    if (!collectionUri.trim()) {
      Alert.alert("Error", "Collection URI is required");
      return false;
    }

    // Validate all mint addresses
    const mints = [
      { name: "Bronze", value: bronzeMint },
      { name: "Silver", value: silverMint },
      { name: "Gold", value: goldMint },
      { name: "Platinum", value: platinumMint },
    ];

    for (const mint of mints) {
      if (!mint.value.trim()) {
        Alert.alert("Error", `${mint.name} badge mint address is required`);
        return false;
      }

      try {
        new PublicKey(mint.value.trim());
      } catch (error) {
        Alert.alert("Error", `Invalid ${mint.name} badge mint address`);
        return false;
      }
    }

    return true;
  };

  const handleInitialize = async () => {
    if (!validateInputs()) return;
    if (!publicKey) {
      Alert.alert("Error", "Wallet not connected");
      return;
    }

    Alert.alert(
      "⚠️ One-Time Setup",
      "This can only be done ONCE for the entire PassPay system.\n\nAre you sure all badge mint addresses are correct?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Initialize",
          style: "default",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const superAdminPubkey = new PublicKey(publicKey);

              console.log("🔧 Initializing badge collection...");

              const signature = await initializeBadgeCollection(
                superAdminPubkey as any,
                {
                  collectionName: collectionName.trim(),
                  collectionSymbol: collectionSymbol.trim(),
                  collectionUri: collectionUri.trim(),
                  bronzeBadgeMint: new PublicKey(bronzeMint.trim()),
                  silverBadgeMint: new PublicKey(silverMint.trim()),
                  goldBadgeMint: new PublicKey(goldMint.trim()),
                  platinumBadgeMint: new PublicKey(platinumMint.trim()),
                }
              );

              console.log("✅ Badge collection initialized:", signature);

              Alert.alert(
                "Success! 🎉",
                `Badge collection initialized successfully!\n\nThe loyalty badge system is now active.\n\nSignature: ${signature.slice(
                  0,
                  8
                )}...`,
                [
                  {
                    text: "OK",
                    onPress: () => router.back(),
                  },
                ]
              );
            } catch (error: any) {
              console.error("❌ Failed to initialize badge collection:", error);
              Alert.alert(
                "Initialization Failed",
                error.message || "An unknown error occurred"
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Initialize Badge Collection</Text>
          <Text style={styles.subtitle}>
            One-time setup for the global loyalty badge system
          </Text>
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Important Warning</Text>
            <Text style={styles.warningText}>
              This can only be done ONCE! Make sure all badge mint addresses are
              correct before submitting. You cannot change them later.
            </Text>
          </View>
        </View>

        <AppCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>Collection Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Collection Name *</Text>
            <AppInput
              placeholder="e.g., PassPay Loyalty Badges"
              value={collectionName}
              onChangeText={setCollectionName}
              maxLength={32}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Collection Symbol *</Text>
            <AppInput
              placeholder="e.g., PPBADGE"
              value={collectionSymbol}
              onChangeText={setCollectionSymbol}
              maxLength={10}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Collection URI *</Text>
            <AppInput
              placeholder="Arweave or IPFS URL for collection metadata"
              value={collectionUri}
              onChangeText={setCollectionUri}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>
              The metadata JSON URL for the badge collection
            </Text>
          </View>
        </AppCard>

        <AppCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>Badge Mint Addresses</Text>
          <Text style={styles.sectionSubtitle}>
            Pre-create 4 NFT mints (one for each tier) before initializing
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              🥉 Bronze Badge Mint *
            </Text>
            <AppInput
              placeholder="Bronze badge mint address"
              value={bronzeMint}
              onChangeText={setBronzeMint}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              🥈 Silver Badge Mint *
            </Text>
            <AppInput
              placeholder="Silver badge mint address"
              value={silverMint}
              onChangeText={setSilverMint}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              🥇 Gold Badge Mint *
            </Text>
            <AppInput
              placeholder="Gold badge mint address"
              value={goldMint}
              onChangeText={setGoldMint}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              💎 Platinum Badge Mint *
            </Text>
            <AppInput
              placeholder="Platinum badge mint address"
              value={platinumMint}
              onChangeText={setPlatinumMint}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </AppCard>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>📋 How to create badge mints</Text>
          <Text style={styles.infoDescription}>
            1. Create 4 NFT mints using Metaplex (one for each tier){"\n"}
            2. Set up metadata for each badge (name, image, attributes){"\n"}
            3. Copy the mint addresses{"\n"}
            4. Paste them above and initialize
          </Text>
        </View>

        <View style={styles.actions}>
          <AppButton
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            style={styles.cancelButton}
          />
          <AppButton
            title={isSubmitting ? "Initializing..." : "Initialize Collection"}
            onPress={handleInitialize}
            loading={isSubmitting}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  warningBox: {
    flexDirection: "row",
    backgroundColor: `${colors.error}15`,
    padding: spacing.md,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    marginBottom: spacing.lg,
  },
  warningIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    ...typography.body,
    color: colors.error,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  warningText: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 20,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: "600",
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  infoBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginBottom: spacing.lg,
  },
  infoText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  infoDescription: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});
