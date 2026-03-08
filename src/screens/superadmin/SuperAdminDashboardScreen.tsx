import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Connection } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";
import { useWallet } from "../../hooks/useWallet";
import { useAuthStore } from "../../store/authStore";
import { useLoyalty } from "../../hooks/useLoyalty";
import { getProgram } from "../../solana/config/program";
import { DEVNET_RPC } from "../../solana/config/constants";
import { shortenAddress } from "../../utils/formatters";
import { safeFetchAll } from "../../solana/utils/safeFetchAll";

export function SuperAdminDashboardScreen() {
  const { publicKey, balance } = useWallet();
  const { role } = useAuthStore();
  const { badgeCollection, fetchBadgeCollection } = useLoyalty();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    activeAdmins: 0,
    totalEvents: 0,
    activeEvents: 0,
    totalTicketsSold: 0,
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
      const adminAccounts = await program.account.admin.all();
      const eventAccounts = await safeFetchAll(connection, program, "Event");

      const activeEvents = eventAccounts.filter(
        (e: any) => e.account.isActive && !e.account.isCancelled && !e.account.isMeetingEnded
      ).length;
      const totalSold = eventAccounts.reduce(
        (sum: number, e: any) =>
          sum + (e.account.ticketsSold?.toNumber?.() ?? e.account.ticketsSold ?? 0),
        0
      );

      const activeAdmins = adminAccounts.filter(
        (a: any) => a.account.isActive
      ).length;

      setStats({
        activeAdmins,
        totalEvents: eventAccounts.length,
        activeEvents,
        totalTicketsSold: totalSold,
      });
    } catch (error: any) {
      console.error("Failed to fetch stats:", error.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchBadgeCollection()]);
    setRefreshing(false);
  };

  const isSuperAdmin = role === "super_admin";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require("../../../assets/icon.png")}
            style={styles.headerLogo}
          />
          <View>
            <Text style={styles.headerRole}>
              {isSuperAdmin ? "Super Admin" : "Admin"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {publicKey ? shortenAddress(publicKey) : "Not connected"}
            </Text>
          </View>
        </View>
        {isSuperAdmin && (
          <LinearGradient
            colors={colors.gradientSuperAdmin as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.roleBadge}
          >
            <Ionicons name="shield-checkmark" size={14} color="#fff" />
            <Text style={styles.roleBadgeText}>SUPER</Text>
          </LinearGradient>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsRow}
      >
        <StatCard
          label="Wallet Balance"
          value={`${balance.toFixed(1)} SOL`}
          change="available"
          gradient={["rgba(0,255,163,0.15)", "rgba(0,255,163,0.03)"]}
          iconColor={colors.primary}
        />
        <StatCard
          label="Active Events"
          value={stats.activeEvents.toString()}
          change={`${stats.totalEvents} total`}
          gradient={["rgba(108,92,231,0.15)", "rgba(108,92,231,0.03)"]}
          iconColor={colors.secondary}
        />
        <StatCard
          label="Tickets Sold"
          value={stats.totalTicketsSold.toString()}
          change={`${stats.totalEvents} events`}
          gradient={["rgba(0,206,201,0.15)", "rgba(0,206,201,0.03)"]}
          iconColor={colors.accent}
        />
        <StatCard
          label="Active Admins"
          value={stats.activeAdmins.toString()}
          change="managing events"
          gradient={["rgba(233,30,99,0.15)", "rgba(233,30,99,0.03)"]}
          iconColor="#E91E63"
        />
      </ScrollView>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <ActionButton
          icon="add-circle"
          label="Create Event"
          color={colors.primary}
          onPress={() => router.push("/(admin)/create-event")}
        />
        <ActionButton
          icon="qr-code"
          label="Scan Ticket"
          color={colors.secondary}
          onPress={() => router.push("/(admin)/check-in")}
        />
        <ActionButton
          icon="storefront"
          label="Add Merchant"
          color="#FF6B35"
          onPress={() => router.push("/(admin)/register-merchant")}
        />
        {isSuperAdmin && (
          <ActionButton
            icon="person-add"
            label="Add Admin"
            color={colors.accent}
            onPress={() => router.push("/(admin)/create-admin")}
          />
        )}
        {isSuperAdmin && (
          <ActionButton
            icon="ribbon"
            label="Setup Badges"
            color="#E91E63"
            onPress={() => router.push("/(admin)/setup-badges")}
          />
        )}
      </View>

      {isSuperAdmin && (
        <>
          <Text style={styles.sectionTitle}>Admin Management</Text>
          <TouchableOpacity
            style={styles.overviewCard}
            activeOpacity={0.7}
            onPress={() => router.push("/(admin)/admin-list")}
          >
            <View style={styles.overviewRow}>
              <View style={styles.overviewLeft}>
                <View style={[styles.overviewIconWrap, { backgroundColor: colors.accent + "18" }]}>
                  <Ionicons name="people" size={18} color={colors.accent} />
                </View>
                <Text style={styles.overviewLabel}>View All Admins</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </>
      )}

      <Text style={styles.sectionTitle}>Merchant Management</Text>
      <TouchableOpacity
        style={styles.overviewCard}
        activeOpacity={0.7}
        onPress={() => router.push("/(admin)/merchant-list")}
      >
        <View style={styles.overviewRow}>
          <View style={styles.overviewLeft}>
            <View style={[styles.overviewIconWrap, { backgroundColor: "#FF6B35" + "18" }]}>
              <Ionicons name="storefront" size={18} color="#FF6B35" />
            </View>
            <Text style={styles.overviewLabel}>View All Merchants</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Platform Overview</Text>
      <View style={styles.overviewCard}>
        <OverviewRow
          icon="people"
          iconColor={colors.primary}
          label="Active Admins"
          value={stats.activeAdmins.toString()}
        />
        <View style={styles.divider} />
        <OverviewRow
          icon="calendar"
          iconColor={colors.secondary}
          label="Total Events"
          value={stats.totalEvents.toString()}
        />
        <View style={styles.divider} />
        <OverviewRow
          icon="ticket"
          iconColor={colors.accent}
          label="Tickets Sold"
          value={stats.totalTicketsSold.toString()}
        />
        <View style={styles.divider} />
        <OverviewRow
          icon="wallet"
          iconColor={colors.primary}
          label="Wallet Balance"
          value={`${balance.toFixed(2)} SOL`}
        />
      </View>

      <Text style={styles.sectionTitle}>System Status</Text>
      <View style={styles.statusCard}>
        <StatusRow
          icon="checkmark-circle"
          color={colors.success}
          label="Solana Devnet"
          status="Connected"
        />
        <StatusRow
          icon="shield-checkmark"
          color={colors.primary}
          label="Program"
          status="Deployed"
        />
        <StatusRow
          icon="cube"
          color={badgeCollection ? colors.success : colors.warning}
          label="Badge Collection"
          status={badgeCollection ? `Active (${badgeCollection.totalIssued} issued)` : "Not Initialized"}
        />
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  change,
  gradient,
  iconColor,
}: {
  label: string;
  value: string;
  change: string;
  gradient: string[];
  iconColor: string;
}) {
  return (
    <LinearGradient
      colors={gradient as any}
      style={styles.statCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <View style={styles.statChangeRow}>
        <Ionicons name="trending-up" size={14} color={iconColor} />
        <Text style={[styles.statChange, { color: iconColor }]}>{change}</Text>
      </View>
    </LinearGradient>
  );
}

function ActionButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.actionIconWrap, { borderColor: color + "40" }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function OverviewRow({
  icon,
  iconColor,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.overviewRow}>
      <View style={styles.overviewLeft}>
        <View style={[styles.overviewIconWrap, { backgroundColor: iconColor + "18" }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={styles.overviewLabel}>{label}</Text>
      </View>
      <Text style={styles.overviewValue}>{value}</Text>
    </View>
  );
}

function StatusRow({
  icon,
  color,
  label,
  status,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  status: string;
}) {
  return (
    <View style={styles.statusRow}>
      <View style={styles.statusLeft}>
        <Ionicons name={icon} size={18} color={color} />
        <Text style={styles.statusLabel}>{label}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: color + "20" }]}>
        <Text style={[styles.statusText, { color }]}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingTop: 56,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  headerRole: {
    fontSize: 22,
    fontFamily: fonts.displayBold,
    color: colors.text,
    marginBottom: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    color: "#fff",
    letterSpacing: 1.2,
  },
  statsRow: {
    paddingHorizontal: spacing.lg,
    gap: 12,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: 170,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: 6,
  },
  statChangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statChange: {
    fontSize: 12,
    fontFamily: fonts.bodyMedium,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.lg,
    gap: 12,
    marginBottom: spacing.lg,
  },
  actionBtn: {
    minWidth: 80,
    flex: 1,
    maxWidth: 120,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
  },
  overviewCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  overviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  overviewLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  overviewIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewLabel: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.text,
  },
  overviewValue: {
    fontSize: 15,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  statusCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
  },
});
