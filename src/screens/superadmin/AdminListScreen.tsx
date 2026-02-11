import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { colors } from "../../theme/colors";

export function AdminListScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>All Admins</Text>
        <Text style={styles.subtitle}>Manage admin accounts system-wide</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>No Admins Yet</Text>
          <Text style={styles.emptyText}>
            Use the SuperAdmin dashboard to create your first admin account
          </Text>
        </View>

        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonText}>
            🚧 Admin management features coming in Phase 1
          </Text>
        </View>
      </View>
    </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  content: {
    padding: 24,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
  },
  comingSoon: {
    paddingTop: 40,
    alignItems: "center",
  },
  comingSoonText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
  },
});
