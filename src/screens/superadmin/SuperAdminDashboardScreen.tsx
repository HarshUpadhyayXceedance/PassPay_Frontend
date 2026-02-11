import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from "react-native";
import { PublicKey, Connection } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { SuperAdminBadge } from "../../components/admin/SuperAdminBadge";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { useWallet } from "../../hooks/useWallet";
import { getProgram } from "../../solana/config/program";
import { DEVNET_RPC } from "../../solana/config/constants";

export function SuperAdminDashboardScreen() {
  const { publicKey } = useWallet();
  const [stats, setStats] = useState({
    totalAdmins: 0,
    totalEvents: 0,
    badgesIssued: 0,
    activeUsers: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [publicKey]);

  const fetchStats = async () => {
    if (!publicKey) return;

    try {
      const connection = new Connection(DEVNET_RPC, "confirmed");
      const provider = new AnchorProvider(
        connection,
        {} as any,
        { commitment: "confirmed" }
      );
      const program = getProgram(provider);

      // Fetch all Admin accounts
      const adminAccounts = await program.account.admin.all();

      // Fetch all Event accounts
      const eventAccounts = await program.account.event.all();

      setStats({
        totalAdmins: adminAccounts.length,
        totalEvents: eventAccounts.length,
        badgesIssued: 0, // Will be implemented with badge collection
        activeUsers: 0, // Will be implemented with attendance records
      });

      console.log("✅ Stats loaded:", {
        admins: adminAccounts.length,
        events: eventAccounts.length,
      });
    } catch (error: any) {
      console.error("❌ Failed to fetch stats:", error);
    }
  };

  const handleCreateAdmin = () => {
    Alert.alert(
      "Create Admin",
      "Navigate to CreateAdminScreen to add a new admin.\n\n(Full navigation will be added in next update)"
    );
  };

  const handleInitializeBadges = () => {
    Alert.alert(
      "Initialize Badges",
      "Badge collection initialization screen coming soon!\n\nThis will allow you to set up the global badge system for loyalty rewards."
    );
  };

  const handleViewAdmins = () => {
    Alert.alert(
      "View Admins",
      "Check the 'Admins' tab to see all admin accounts in the system."
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <SuperAdminBadge size="large" />
        <Text style={styles.title}>System Overview</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard title="Total Admins" value={stats.totalAdmins.toString()} icon="👥" />
        <StatCard title="Total Events" value={stats.totalEvents.toString()} icon="🎫" />
        <StatCard title="Badges Issued" value={stats.badgesIssued.toString()} icon="🏆" />
        <StatCard title="Active Users" value={stats.activeUsers.toString()} icon="✅" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity style={styles.actionCard} onPress={handleCreateAdmin}>
          <Text style={styles.actionIcon}>➕</Text>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Add New Admin</Text>
            <Text style={styles.actionDesc}>
              Grant admin access to event organizers
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={handleInitializeBadges}>
          <Text style={styles.actionIcon}>🎖️</Text>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Initialize Badge Collection</Text>
            <Text style={styles.actionDesc}>
              One-time setup for global badge system
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={handleViewAdmins}>
          <Text style={styles.actionIcon}>📋</Text>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>View All Admins</Text>
            <Text style={styles.actionDesc}>
              Manage and deactivate admin accounts
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xxxl,
    gap: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  comingSoon: {
    padding: 24,
    alignItems: "center",
  },
  comingSoonText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
  },
});
