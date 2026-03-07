import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { PublicKey, Connection } from "@solana/web3.js";
import { showSuccess, showError } from "../../utils/alerts";
import { confirm } from "../../components/ui/ConfirmDialogProvider";
import { AnchorProvider } from "@coral-xyz/anchor";
import { AppCard } from "../../components/ui/AppCard";
import { AppButton } from "../../components/ui/AppButton";
import { AppLoader } from "../../components/ui/AppLoader";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { shortenAddress, decodeAccountString } from "../../utils/formatters";
import { useWallet } from "../../hooks/useWallet";
import { getProgram } from "../../solana/config/program";
import { DEVNET_RPC } from "../../solana/config/constants";
import { deactivateAdmin } from "../../solana/actions/deactivateAdmin";

interface AdminAccount {
  publicKey: string;
  name: string;
  authority: string;
  createdBy: string;
  isActive: boolean;
}

export function AdminListScreen() {
  const { publicKey } = useWallet();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAdmins = async () => {
    if (!publicKey) return;

    try {
      setIsLoading(true);
      const connection = new Connection(DEVNET_RPC, "confirmed");
      const provider = new AnchorProvider(
        connection,
        {} as any,
        { commitment: "confirmed" }
      );
      const program = getProgram(provider);

      // Fetch all Admin accounts
      const adminAccounts = await program.account.admin.all();

      const adminsData: AdminAccount[] = adminAccounts
        .filter((acc: any) => acc.account.isActive)
        .map((acc: any) => ({
          publicKey: acc.publicKey.toBase58(),
          name: decodeAccountString(acc.account.name),
          authority: acc.account.authority.toBase58(),
          createdBy: acc.account.createdBy.toBase58(),
          isActive: true,
        }));

      // Sort by name
      adminsData.sort((a, b) => a.name.localeCompare(b.name));

      setAdmins(adminsData);
      console.log(`Loaded ${adminsData.length} active admins`);
    } catch (error: any) {
      console.error("Failed to fetch admins:", error);
      showError("Error", "Failed to load admins. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, [publicKey]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAdmins();
  };

  const handleDeactivateAdmin = async (admin: AdminAccount) => {
    if (!publicKey) {
      showError("Error", "Wallet not connected");
      return;
    }

    confirm({
      title: "Deactivate Admin",
      message: `Are you sure you want to deactivate "${admin.name}"?\n\nThey will lose access to admin features.`,
      type: "danger",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("Deactivating admin:", admin.name);
              const superAdminPubkey = new PublicKey(publicKey);
              const adminPubkey = new PublicKey(admin.authority);

              const signature = await deactivateAdmin(
                superAdminPubkey,
                adminPubkey
              );

              console.log("Admin deactivated:", signature);
              showSuccess("Success", `Admin "${admin.name}" has been deactivated`);

              // Refresh the list
              fetchAdmins();
            } catch (error: any) {
              console.error("Failed to deactivate admin:", error);
              showError(
                "Failed to Deactivate",
                error.message || "An unknown error occurred"
              );
            }
          },
        },
      ],
    });
  };

  const renderAdmin = ({ item }: { item: AdminAccount }) => (
    <AppCard style={styles.adminCard}>
      <View style={styles.adminHeader}>
        <View style={styles.adminInfo}>
          <Text style={styles.adminName}>{item.name}</Text>
          <Text style={styles.adminAddress}>
            {shortenAddress(item.authority, 6)}
          </Text>
        </View>
        <View style={[styles.statusBadge, item.isActive && styles.activeBadge]}>
          <Text
            style={[styles.statusText, item.isActive && styles.activeText]}
          >
            {item.isActive ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>

      <View style={styles.adminMeta}>
        <Text style={styles.metaText}>
          Created by: {shortenAddress(item.createdBy, 4)}
        </Text>
      </View>

      {item.isActive && (
        <View style={styles.adminActions}>
          <AppButton
            title="Deactivate"
            onPress={() => handleDeactivateAdmin(item)}
            variant="outline"
            size="sm"
            style={styles.deactivateButton}
          />
        </View>
      )}
    </AppCard>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <AppLoader />
        <Text style={styles.loadingText}>Loading admins...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={admins}
        renderItem={renderAdmin}
        keyExtractor={(item) => item.publicKey}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Active Admins</Text>
            <Text style={styles.subtitle}>
              {admins.length} active admin{admins.length !== 1 ? "s" : ""}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Admins Yet</Text>
            <Text style={styles.emptyText}>
              Use the SuperAdmin dashboard to create your first admin account
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  list: {
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
  adminCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  adminHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  adminInfo: {
    flex: 1,
  },
  adminName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  adminAddress: {
    ...typography.body,
    color: colors.textMuted,
    fontFamily: "monospace",
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  activeBadge: {
    backgroundColor: `${colors.primary}20`,
  },
  statusText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "600",
  },
  activeText: {
    color: colors.primary,
  },
  adminMeta: {
    marginBottom: spacing.md,
  },
  metaText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  adminActions: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  deactivateButton: {
    borderColor: colors.error,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 280,
  },
});
