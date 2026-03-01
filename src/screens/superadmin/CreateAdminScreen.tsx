import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { PublicKey, Connection } from "@solana/web3.js";
import { showSuccess, showWarning, showError } from "../../utils/alerts";
import { AnchorProvider } from "@coral-xyz/anchor";
import { AppInput } from "../../components/ui/AppInput";
import { AppButton } from "../../components/ui/AppButton";
import { AppCard } from "../../components/ui/AppCard";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { useWallet } from "../../hooks/useWallet";
import { createAdmin } from "../../solana/actions/createAdmin";
import { getProgram } from "../../solana/config/program";
import { findAdminPda } from "../../solana/pda";
import { DEVNET_RPC } from "../../solana/config/constants";

export function CreateAdminScreen() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const [adminName, setAdminName] = useState("");
  const [adminWallet, setAdminWallet] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateInputs = (): boolean => {
    if (!adminName.trim()) {
      showError("Error", "Admin name is required");
      return false;
    }

    if (adminName.length > 64) {
      showError("Error", "Admin name must be 64 characters or less");
      return false;
    }

    if (!adminWallet.trim()) {
      showError("Error", "Admin wallet address is required");
      return false;
    }

    // Validate wallet address
    try {
      new PublicKey(adminWallet.trim());
    } catch (error) {
      showError("Error", "Invalid Solana wallet address");
      return false;
    }

    return true;
  };

  const handleCreateAdmin = async () => {
    if (!validateInputs()) return;
    if (!publicKey) {
      showError("Error", "Wallet not connected");
      return;
    }

    setIsSubmitting(true);
    try {
      const adminPubkey = new PublicKey(adminWallet.trim());
      const superAdminPubkey = new PublicKey(publicKey);

      // Check if admin PDA already exists
      const connection = new Connection(DEVNET_RPC, "confirmed");
      const provider = new AnchorProvider(
        connection,
        {} as any,
        { commitment: "confirmed" }
      );
      const program = getProgram(provider);
      const [adminPda] = findAdminPda(adminPubkey);

      const existingAdmin = await program.account.admin.fetchNullable(adminPda);
      if (existingAdmin) {
        showWarning(
          "Admin Already Exists",
          `An admin account already exists for this wallet address.\n\nName: ${existingAdmin.name}\nStatus: ${existingAdmin.isActive ? "Active" : "Inactive"}`
        );
        setIsSubmitting(false);
        return;
      }

      console.log("🔧 Creating admin:", {
        name: adminName.trim(),
        wallet: adminPubkey.toBase58(),
      });

      const signature = await createAdmin(
        superAdminPubkey,
        adminPubkey,
        adminName.trim()
      );

      console.log("✅ Admin created successfully:", signature);

      showSuccess("Success", `Admin "${adminName}" created successfully!`);
      router.back();

      // Reset form
      setAdminName("");
      setAdminWallet("");
    } catch (error: any) {
      console.error("❌ Failed to create admin:", error);
      const msg = error.message || "An unknown error occurred";
      if (msg.includes("already in use")) {
        showWarning(
          "Admin Already Exists",
          "An admin account already exists for this wallet address."
        );
      } else if (msg.includes("Cancelled") || msg.includes("CancellationException")) {
        showWarning("Cancelled", "Transaction was cancelled.");
      } else {
        showError("Failed to Create Admin", msg);
      }
    } finally {
      setIsSubmitting(false);
    }
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
          <Text style={styles.title}>Create New Admin</Text>
          <Text style={styles.subtitle}>
            Add a new admin to the PassPay system
          </Text>
        </View>

        <AppCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>Admin Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Admin Name <Text style={styles.required}>*</Text>
            </Text>
            <AppInput
              placeholder="e.g., John Doe"
              value={adminName}
              onChangeText={setAdminName}
              maxLength={64}
              autoCapitalize="words"
            />
            <Text style={styles.hint}>
              Maximum 64 characters. This will identify the admin in the system.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Admin Wallet Address <Text style={styles.required}>*</Text>
            </Text>
            <AppInput
              placeholder="Enter Solana wallet address"
              value={adminWallet}
              onChangeText={setAdminWallet}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.hint}>
              The Solana wallet address for the new admin. They will use this
              wallet to access admin features.
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>ℹ️ Info</Text>
            <Text style={styles.infoDescription}>
              Once created, the admin will be able to:
              {"\n"}• Create and manage events
              {"\n"}• Register merchants for events
              {"\n"}• Check-in attendees
              {"\n"}• View event analytics
            </Text>
          </View>
        </AppCard>

        <View style={styles.actions}>
          <AppButton
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            style={styles.cancelButton}
          />
          <AppButton
            title={isSubmitting ? "Creating..." : "Create Admin"}
            onPress={handleCreateAdmin}
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
    marginBottom: spacing.xl,
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
  formCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
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
  required: {
    color: colors.error,
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
    marginTop: spacing.md,
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
