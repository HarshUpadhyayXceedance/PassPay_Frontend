import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Connection, PublicKey } from "@solana/web3.js";
import { BadgeCard } from "../../components/loyalty/BadgeCard";
import { AppLoader } from "../../components/ui/AppLoader";
import { Confetti } from "../../components/animations/Confetti";
import { useLoyalty } from "../../hooks/useLoyalty";
import { useWallet } from "../../hooks/useWallet";
import { apiClaimBadge } from "../../services/api/eventApi";
import { BadgeTier, TIER_NAMES } from "../../types/loyalty";
import { getAssociatedTokenAddress } from "../../solana/utils/tokenUtils";
import { DEVNET_RPC } from "../../solana/config/constants";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";

const TIERS = [BadgeTier.Bronze, BadgeTier.Silver, BadgeTier.Gold, BadgeTier.Platinum];

export function BadgeCollectionScreen() {
  const { loyaltyBenefits, badgeCollection, isLoading, error, fetchLoyaltyBenefits, fetchBadgeCollection } = useLoyalty();
  const { publicKey } = useWallet();

  const [claimedTiers, setClaimedTiers] = useState<Set<BadgeTier>>(new Set());
  const [claimingTier, setClaimingTier] = useState<BadgeTier | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const tier = loyaltyBenefits?.currentTier ?? BadgeTier.None;
  const totalEvents = loyaltyBenefits?.totalEvents ?? 0;

  // Explicitly fetch loyalty data when screen mounts
  useEffect(() => {
    fetchLoyaltyBenefits();
    fetchBadgeCollection();
  }, []);

  // Check which badges have already been claimed by reading on-chain ATAs
  const checkClaimedBadges = useCallback(async () => {
    if (!publicKey || !badgeCollection) return;

    try {
      const connection = new Connection(DEVNET_RPC, "confirmed");
      const userPubkey = new PublicKey(publicKey);
      const claimed = new Set<BadgeTier>();

      const mintMap: [BadgeTier, PublicKey][] = [
        [BadgeTier.Bronze, badgeCollection.bronzeBadgeMint],
        [BadgeTier.Silver, badgeCollection.silverBadgeMint],
        [BadgeTier.Gold, badgeCollection.goldBadgeMint],
        [BadgeTier.Platinum, badgeCollection.platinumBadgeMint],
      ];

      for (const [t, mint] of mintMap) {
        if (!mint || mint.equals(PublicKey.default)) continue;
        const ata = getAssociatedTokenAddress(mint, userPubkey);
        try {
          const accountInfo = await connection.getAccountInfo(ata);
          if (accountInfo && accountInfo.data.length >= 72) {
            // SPL token account: amount is u64 LE at bytes 64-72
            // Avoid readBigUInt64LE / BigInt — not reliable in Hermes
            const amountBytes = accountInfo.data.slice(64, 72);
            const hasTokens = amountBytes.some((b: number) => b > 0);
            if (hasTokens) {
              claimed.add(t);
            }
          }
        } catch {
          // ATA doesn't exist
        }
      }

      setClaimedTiers(claimed);
    } catch (error) {
      console.error("Failed to check claimed badges:", error);
    }
  }, [publicKey, badgeCollection]);

  useEffect(() => {
    checkClaimedBadges();
  }, [checkClaimedBadges]);

  const handleClaim = async (badgeTier: BadgeTier) => {
    if (claimingTier !== null) return;

    setClaimingTier(badgeTier);
    try {
      await apiClaimBadge();

      setClaimedTiers((prev) => new Set([...prev, badgeTier]));

      setShowConfetti(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setShowConfetti(false), 3000);

      Alert.alert(
        "Badge Claimed!",
        `Your ${TIER_NAMES[badgeTier]} soulbound NFT badge has been minted to your wallet.`
      );
    } catch (error: any) {
      const msg = error.message || "Failed to claim badge";
      if (msg.includes("BadgeAlreadyClaimed")) {
        setClaimedTiers((prev) => new Set([...prev, badgeTier]));
        Alert.alert("Already Claimed", "You've already claimed this badge.");
      } else {
        Alert.alert("Claim Failed", msg);
      }
    } finally {
      setClaimingTier(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchLoyaltyBenefits(), fetchBadgeCollection()]);
    await checkClaimedBadges();
    setRefreshing(false);
  };

  if (isLoading && !refreshing) {
    return <AppLoader fullScreen message="Loading badges..." />;
  }

  return (
    <View style={styles.wrapper}>
      {showConfetti && <Confetti />}
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
          <Text style={styles.title}>Badge Collection</Text>
          <Text style={styles.subtitle}>
            Earn soulbound NFT badges by attending events
          </Text>
        </View>

        {/* Error banner */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              Failed to load loyalty data: {error}
            </Text>
          </View>
        )}

        {/* Current status */}
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={styles.statusValue}>{totalEvents}</Text>
            <Text style={styles.statusLabel}>Events</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <Text style={styles.statusValue}>{TIER_NAMES[tier]}</Text>
            <Text style={styles.statusLabel}>Tier</Text>
          </View>
        </View>

        {!badgeCollection && (
          <View style={styles.notInitializedBox}>
            <Text style={styles.notInitializedText}>
              Badge collection has not been set up yet. Contact an admin to initialize it.
            </Text>
          </View>
        )}

        <View style={styles.grid}>
          {TIERS.map((t) => {
            const isEarned = tier >= t;
            const isClaimed = claimedTiers.has(t);
            // Only show claim for the user's current tier if not yet claimed
            const canClaim = isEarned && !isClaimed && !!badgeCollection && tier === t;

            return (
              <BadgeCard
                key={t}
                tier={t}
                isEarned={isEarned}
                totalEvents={totalEvents}
                isClaimed={isClaimed}
                onClaim={canClaim ? () => handleClaim(t) : undefined}
                isClaiming={claimingTier === t}
              />
            );
          })}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How Badges Work</Text>
          <Text style={styles.infoText}>
            Badges are soulbound NFTs minted when you claim them after checking
            in at events. They cannot be transferred and serve as proof of your
            attendance history. Each tier unlocks additional benefits and discounts.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.25)",
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.error,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statusItem: {
    flex: 1,
    alignItems: "center" as const,
  },
  statusValue: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  notInitializedBox: {
    backgroundColor: colors.warningLight,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 165, 2, 0.25)",
  },
  notInitializedText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm + 4,
    marginBottom: spacing.xl,
  },
  infoBox: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
  },
  infoTitle: {
    fontSize: 15,
    fontFamily: fonts.headingSemiBold,
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
