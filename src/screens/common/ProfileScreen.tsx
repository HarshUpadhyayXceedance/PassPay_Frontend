import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useWallet } from "../../hooks/useWallet";
import { useAuthStore } from "../../store/authStore";
import { useLoyalty } from "../../hooks/useLoyalty";
import { shortenAddress, formatSOL, lamportsToSOL } from "../../utils/formatters";
import { TierBadge } from "../../components/loyalty/TierBadge";
import { TierProgressBar } from "../../components/loyalty/TierProgressBar";
import { BadgeTier } from "../../types/loyalty";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";

export function ProfileScreen() {
  const router = useRouter();
  const { publicKey, balance, disconnect } = useWallet();
  const role = useAuthStore((s) => s.role);
  const { loyaltyBenefits, userAttendance } = useLoyalty();

  const displayAddress = publicKey ? shortenAddress(publicKey, 6) : "Not connected";
  const isUserRole = role === "user";
  const tier = loyaltyBenefits?.currentTier ?? BadgeTier.None;
  const totalEvents = loyaltyBenefits?.totalEvents ?? 0;
  const lifetimeSpend = loyaltyBenefits?.lifetimeSpend ?? 0;
  const currentStreak = loyaltyBenefits?.currentStreak ?? 0;

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
        <View style={styles.headerLeft}>
          <Image
            source={require("../../../assets/icon.png")}
            style={styles.headerLogo}
          />
          <View>
            <Text style={styles.headerRole}>
              {role === "super_admin"
                ? "Super Admin"
                : role === "admin"
                ? "Admin"
                : role === "merchant"
                ? "Merchant"
                : "Profile"}
            </Text>
            <Text style={styles.headerSub}>{displayAddress}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Avatar + Tier Section ---- */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarLetter}>
                {role?.charAt(0).toUpperCase() ?? "P"}
              </Text>
            </LinearGradient>
          </View>
          <Text style={styles.displayName}>PassPay User</Text>
          {isUserRole && <TierBadge tier={tier} size="medium" />}
          <Text style={styles.addressSubtitle}>{displayAddress}</Text>
        </View>

        {/* ---- Loyalty Stats Row (user only) ---- */}
        {isUserRole && (
          <View style={styles.loyaltyStats}>
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyValue}>{totalEvents}</Text>
              <Text style={styles.loyaltyLabel}>Events</Text>
            </View>
            <View style={styles.loyaltyDivider} />
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyValue}>
                {lamportsToSOL(lifetimeSpend).toFixed(1)}
              </Text>
              <Text style={styles.loyaltyLabel}>SOL Spent</Text>
            </View>
            <View style={styles.loyaltyDivider} />
            <View style={styles.loyaltyStat}>
              <Text style={styles.loyaltyValue}>
                {currentStreak > 0 ? String(currentStreak) : "0"}
              </Text>
              <Text style={styles.loyaltyLabel}>Streak</Text>
            </View>
          </View>
        )}

        {/* ---- Tier Progress (user only) ---- */}
        {isUserRole && (
          <View style={styles.progressSection}>
            <TierProgressBar currentEvents={totalEvents} currentTier={tier} />
          </View>
        )}

        {/* ---- Wallet Info Row ---- */}
        <View style={styles.walletCard}>
          <View style={styles.walletLeft}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.primaryMuted },
              ]}
            >
              <Ionicons name="wallet" size={20} color={colors.primary} />
            </View>
            <Text style={styles.walletAddress}>{displayAddress}</Text>
          </View>
          <View style={styles.walletRight}>
            <Text style={styles.walletBalance}>
              {formatSOL(balance)} SOL
            </Text>
            <TouchableOpacity
              onPress={copyAddress}
              activeOpacity={0.7}
              style={[
                styles.iconContainerSmall,
                { backgroundColor: colors.primaryMuted },
              ]}
            >
              <Ionicons
                name="copy-outline"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ---- Loyalty Section (user only) ---- */}
        {isUserRole && (
          <>
            <Text style={styles.sectionLabel}>LOYALTY</Text>
            <View style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.6}
                onPress={() => router.push("loyalty" as any)}
              >
                <View style={styles.menuRowLeft}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: "rgba(255, 215, 0, 0.15)" },
                    ]}
                  >
                    <Ionicons name="trophy" size={20} color={colors.tierGold} />
                  </View>
                  <Text style={styles.menuRowLabel}>View My Benefits</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.6}
                onPress={() => router.push("badges" as any)}
              >
                <View style={styles.menuRowLeft}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: colors.secondaryMuted },
                    ]}
                  >
                    <Ionicons name="ribbon" size={20} color={colors.secondary} />
                  </View>
                  <Text style={styles.menuRowLabel}>My Badges</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ---- Account Section (user only) ---- */}
        {isUserRole && (
          <>
            <Text style={styles.sectionLabel}>ACCOUNT</Text>
            <View style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.6}
                onPress={() => router.push("my-passes" as any)}
              >
                <View style={styles.menuRowLeft}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: colors.primaryMuted },
                    ]}
                  >
                    <Ionicons name="ticket" size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.menuRowLabel}>My Passes</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ---- Disconnect Section ---- */}
        <Text style={styles.sectionLabel}>APP</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.6}
            onPress={handleDisconnect}
          >
            <View style={styles.menuRowLeft}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.errorLight },
                ]}
              >
                <Ionicons name="log-out" size={20} color={colors.error} />
              </View>
              <Text style={[styles.menuRowLabel, styles.disconnectText]}>
                Disconnect Wallet
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
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
  headerSub: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },

  avatarSection: {
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  avatarWrapper: {
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 36,
    fontFamily: fonts.heading,
    color: colors.background,
  },
  displayName: {
    fontSize: 22,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  addressSubtitle: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Loyalty stats
  loyaltyStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  loyaltyStat: {
    flex: 1,
    alignItems: "center",
  },
  loyaltyValue: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  loyaltyLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  loyaltyDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },

  // Progress section
  progressSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  // Icon containers
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainerSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  // Wallet card
  walletCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: spacing.lg,
  },
  walletLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  walletAddress: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  walletRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  walletBalance: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },

  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },

  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },

  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuRowLabel: {
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },

  disconnectText: {
    color: colors.error,
  },
});
