import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { colors } from "../../theme/colors";

export function SuperAdminDashboardScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>⚡ SUPER ADMIN</Text>
        </View>
        <Text style={styles.title}>System Overview</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard title="Total Admins" value="0" icon="👥" />
        <StatCard title="Total Events" value="0" icon="🎫" />
        <StatCard title="Badges Issued" value="0" icon="🏆" />
        <StatCard title="Active Users" value="0" icon="✅" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionCard}>
          <Text style={styles.actionIcon}>➕</Text>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Add New Admin</Text>
            <Text style={styles.actionDesc}>
              Grant admin access to event organizers
            </Text>
          </View>
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.actionIcon}>🎖️</Text>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Initialize Badge Collection</Text>
            <Text style={styles.actionDesc}>
              One-time setup for global badge system
            </Text>
          </View>
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.actionIcon}>📋</Text>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>View All Admins</Text>
            <Text style={styles.actionDesc}>
              Manage and deactivate admin accounts
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.comingSoon}>
        <Text style={styles.comingSoonText}>
          🚧 Full SuperAdmin features coming in Phase 1
        </Text>
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
    padding: 24,
    paddingTop: 60,
  },
  badgeContainer: {
    alignSelf: "flex-start",
    backgroundColor: colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
  },
  badgeText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
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
