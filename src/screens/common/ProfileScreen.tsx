import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useWallet } from "../../hooks/useWallet";
import { useAuthStore } from "../../store/authStore";
import { shortenAddress, formatSOL } from "../../utils/formatters";

// --- Placeholder recent activity data ---
const RECENT_ACTIVITY = [
  {
    id: "1",
    icon: "\u{1F3AB}",
    description: "Purchased GA Pass - ETH Denver",
    date: "Feb 10, 2026",
    amount: -0.85,
  },
  {
    id: "2",
    icon: "\u{2615}",
    description: "Coffee at Brew3 Booth",
    date: "Feb 9, 2026",
    amount: -0.02,
  },
  {
    id: "3",
    icon: "\u{1F4B8}",
    description: "Received refund",
    date: "Feb 8, 2026",
    amount: 0.5,
  },
  {
    id: "4",
    icon: "\u{1F3AB}",
    description: "Purchased VIP Pass - Solana Hacker House",
    date: "Feb 7, 2026",
    amount: -2.0,
  },
  {
    id: "5",
    icon: "\u{1F4B8}",
    description: "Wallet top-up",
    date: "Feb 5, 2026",
    amount: 5.0,
  },
];

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { publicKey, balance, disconnect } = useWallet();
  const role = useAuthStore((s) => s.role);

  const displayAddress = publicKey ? shortenAddress(publicKey, 6) : "Not connected";

  const copyAddress = async () => {
    if (publicKey) {
      await Clipboard.setStringAsync(publicKey);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Copied", "Wallet address copied to clipboard");
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      "Disconnect Wallet",
      "This will remove your wallet from this device. Make sure you have backed up your keys.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: disconnect,
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      {/* ---- Header ---- */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation.navigate("Settings")}
          activeOpacity={0.7}
        >
          <Text style={styles.headerIcon}>{"\u2699\uFE0F"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Avatar Section ---- */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>
                {role?.charAt(0).toUpperCase() ?? "P"}
              </Text>
            </View>
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeIcon}>{"\u270F\uFE0F"}</Text>
            </View>
          </View>
          <Text style={styles.displayName}>PassPay User</Text>
          <Text style={styles.addressSubtitle}>{displayAddress}</Text>
        </View>

        {/* ---- Wallet Info Row ---- */}
        <View style={styles.walletCard}>
          <View style={styles.walletLeft}>
            <Text style={styles.walletIcon}>{"\uD83D\uDCB3"}</Text>
            <Text style={styles.walletAddress}>{displayAddress}</Text>
          </View>
          <View style={styles.walletRight}>
            <Text style={styles.walletBalance}>
              {formatSOL(balance)} SOL
            </Text>
            <TouchableOpacity onPress={copyAddress} activeOpacity={0.7}>
              <Text style={styles.copyIcon}>{"\uD83D\uDCCB"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ---- Account Section ---- */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.6}
            onPress={() => {
              // Navigate to My Passes (MyPasses tab)
              try {
                navigation.navigate("MyPasses");
              } catch {
                // navigation target may not exist yet
              }
            }}
          >
            <View style={styles.menuRowLeft}>
              <Text style={styles.menuRowIcon}>{"\uD83C\uDF9F\uFE0F"}</Text>
              <Text style={styles.menuRowLabel}>My Passes</Text>
            </View>
            <Text style={styles.menuRowArrow}>{"\u203A"}</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.6}
            onPress={() => {
              try {
                navigation.navigate("Transactions");
              } catch {
                // navigation target may not exist yet
              }
            }}
          >
            <View style={styles.menuRowLeft}>
              <Text style={styles.menuRowIcon}>{"\uD83D\uDCC3"}</Text>
              <Text style={styles.menuRowLabel}>Transaction History</Text>
            </View>
            <Text style={styles.menuRowArrow}>{"\u203A"}</Text>
          </TouchableOpacity>
        </View>

        {/* ---- Recent Activity Section ---- */}
        <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
        <View style={styles.sectionCard}>
          {RECENT_ACTIVITY.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <View style={styles.menuDivider} />}
              <View style={styles.activityRow}>
                <View style={styles.activityLeft}>
                  <Text style={styles.activityIcon}>{item.icon}</Text>
                  <View style={styles.activityTextGroup}>
                    <Text style={styles.activityDescription} numberOfLines={1}>
                      {item.description}
                    </Text>
                    <Text style={styles.activityDate}>{item.date}</Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.activityAmount,
                    item.amount >= 0
                      ? styles.amountPositive
                      : styles.amountNegative,
                  ]}
                >
                  {item.amount >= 0 ? "+" : ""}
                  {formatSOL(Math.abs(item.amount))} SOL
                </Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* ---- Disconnect Section ---- */}
        <Text style={styles.sectionLabel}>APP</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.6}
            onPress={handleDisconnect}
          >
            <View style={styles.menuRowLeft}>
              <Text style={styles.menuRowIcon}>{"\uD83D\uDD0C"}</Text>
              <Text style={[styles.menuRowLabel, styles.disconnectText]}>
                Disconnect Wallet
              </Text>
            </View>
            <Text style={[styles.menuRowArrow, styles.disconnectText]}>
              {"\u203A"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Colors ──────────────────────────────────────────
const C = {
  bg: "#0A0E1A",
  card: "#141829",
  border: "#1E2235",
  green: "#00CEC9",
  red: "#FF6B6B",
  text: "#FFFFFF",
  secondary: "#8F95B2",
};

const styles = StyleSheet.create({
  // ── Layout ────────────────────────────────────────
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // ── Header ────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: C.bg,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: C.text,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  headerIcon: {
    fontSize: 20,
  },

  // ── Avatar Section ────────────────────────────────
  avatarSection: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    // Simulated gradient via solid teal
    backgroundColor: C.green,
  },
  avatarLetter: {
    fontSize: 40,
    fontWeight: "700",
    color: C.bg,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  editBadgeIcon: {
    fontSize: 14,
  },
  displayName: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    marginBottom: 4,
  },
  addressSubtitle: {
    fontSize: 14,
    color: C.secondary,
    fontFamily: "monospace",
  },

  // ── Wallet Card ───────────────────────────────────
  walletCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 28,
  },
  walletLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  walletIcon: {
    fontSize: 20,
  },
  walletAddress: {
    fontSize: 14,
    color: C.secondary,
    fontFamily: "monospace",
  },
  walletRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  walletBalance: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
  },
  copyIcon: {
    fontSize: 18,
  },

  // ── Section Label ─────────────────────────────────
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: C.secondary,
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },

  // ── Section Card ──────────────────────────────────
  sectionCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    marginBottom: 28,
  },

  // ── Menu Row ──────────────────────────────────────
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuRowIcon: {
    fontSize: 20,
  },
  menuRowLabel: {
    fontSize: 16,
    color: C.text,
  },
  menuRowArrow: {
    fontSize: 24,
    color: C.secondary,
    fontWeight: "300",
  },
  menuDivider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 16,
  },

  // ── Activity Row ──────────────────────────────────
  activityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  activityLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  activityIcon: {
    fontSize: 20,
  },
  activityTextGroup: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 15,
    color: C.text,
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: C.secondary,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  amountPositive: {
    color: C.green,
  },
  amountNegative: {
    color: C.red,
  },

  // ── Disconnect ────────────────────────────────────
  disconnectText: {
    color: C.red,
  },
});
