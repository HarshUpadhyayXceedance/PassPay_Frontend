import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PublicKey } from "@solana/web3.js";
import { useEvents } from "../../hooks/useEvents";
import { useWallet } from "../../hooks/useWallet";
import { useTickets } from "../../hooks/useTickets";
import { getConnection } from "../../solana/config/connection";
import { getAssociatedTokenAddress } from "../../solana/utils/tokenUtils";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";
import { shortenAddress, formatSOL } from "../../utils/formatters";
import { showSuccess, showError } from "../../utils/alerts";
import { confirm } from "../../components/ui/ConfirmDialogProvider";

export function AcceptTransferScreen() {
  const router = useRouter();
  const { ticketMint, eventKey, from } = useLocalSearchParams<{
    ticketMint: string;
    eventKey: string;
    from: string;
  }>();
  const { publicKey, refreshBalance } = useWallet();
  const { getEvent } = useEvents();
  const { fetchMyTickets } = useTickets();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const event = getEvent(eventKey as string);

  const verifyTransfer = useCallback(async () => {
    if (!publicKey || !ticketMint) {
      setVerifying(false);
      return;
    }
    try {
      const connection = getConnection();
      const mintPubkey = new PublicKey(ticketMint as string);
      const ownerPubkey = new PublicKey(publicKey);
      const ata = getAssociatedTokenAddress(mintPubkey, ownerPubkey);

      const accountInfo = await connection.getAccountInfo(ata);
      if (accountInfo && accountInfo.data.length > 0) {
        const data = accountInfo.data;
        const amount =
          data[64] +
          data[65] * 256 +
          data[66] * 65536 +
          data[67] * 16777216;
        setVerified(amount >= 1);
      } else {
        setVerified(false);
      }
    } catch (error) {
      console.error("Failed to verify transfer:", error);
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  }, [publicKey, ticketMint]);

  useEffect(() => {
    verifyTransfer();
  }, [verifyTransfer]);

  if (!ticketMint || !eventKey || !from) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Accept Transfer</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.textMuted} />
          <Text style={styles.errorText}>Invalid transfer link</Text>
          <Text style={styles.errorSubText}>
            This transfer link is missing required information.
          </Text>
        </View>
      </View>
    );
  }

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await verifyTransfer();
      await refreshBalance();
      await fetchMyTickets();
      showSuccess(
        "Transfer Confirmed!",
        verified
          ? "The ticket is in your wallet. View it in My Passes."
          : "The transfer may still be processing. Check My Passes shortly."
      );
      router.replace("/(user)/my-passes");
    } catch (error: any) {
      showError("Error", error.message ?? "Failed to verify transfer");
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    confirm({
      title: "Decline Transfer?",
      message: "The ticket will remain with the sender.",
      type: "danger",
      buttons: [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        { text: "Decline", style: "destructive", onPress: () => router.back() },
      ],
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Accept Transfer</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <Ionicons name="gift-outline" size={48} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.transferTitle}>You've received a ticket!</Text>

          {verifying ? (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.statusText}>Verifying on-chain...</Text>
            </View>
          ) : verified ? (
            <View style={styles.statusRow}>
              <Ionicons name="shield-checkmark" size={16} color={colors.success} />
              <Text style={[styles.statusText, { color: colors.success }]}>
                Verified on-chain
              </Text>
            </View>
          ) : (
            <View style={styles.statusRow}>
              <Ionicons name="time-outline" size={16} color={colors.warning} />
              <Text style={[styles.statusText, { color: colors.warning }]}>
                Pending verification
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>FROM</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.avatarSmall}>
              <Ionicons name="person" size={16} color={colors.primary} />
            </View>
            <View style={styles.senderInfo}>
              <Text style={styles.senderLabel}>Sender</Text>
              <Text style={styles.senderAddress}>
                {shortenAddress(from as string, 6)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>TICKET DETAILS</Text>
        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Event</Text>
            <Text style={styles.detailValue}>
              {event?.name ?? "Unknown Event"}
            </Text>
          </View>
          {event?.venue && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Venue</Text>
              <Text style={styles.detailValue}>{event.venue}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ticket Mint</Text>
            <Text style={styles.detailValueMono}>
              {shortenAddress(ticketMint as string, 8)}
            </Text>
          </View>
          {event && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Value</Text>
              <Text style={styles.detailValueHighlight}>
                {formatSOL(event.ticketPrice)} SOL
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>RECEIVING TO</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.avatarSmall, { backgroundColor: colors.secondaryMuted }]}>
              <Ionicons name="wallet" size={16} color={colors.secondary} />
            </View>
            <View style={styles.senderInfo}>
              <Text style={styles.senderLabel}>Your Wallet</Text>
              <Text style={styles.senderAddress}>
                {publicKey ? shortenAddress(publicKey, 6) : "Not connected"}
              </Text>
            </View>
            <View style={styles.checkmark}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.acceptButton, accepting && styles.buttonDisabled]}
          onPress={handleAccept}
          disabled={accepting}
          activeOpacity={0.8}
        >
          {accepting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>Accept Transfer</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.declineButton}
          onPress={handleDecline}
          disabled={accepting}
          activeOpacity={0.8}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  headerSpacer: { width: 40 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  errorText: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.text,
    marginTop: spacing.md,
  },
  errorSubText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  iconContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  transferTitle: {
    fontSize: 22,
    fontFamily: fonts.displayBold,
    color: colors.text,
    textAlign: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusText: {
    fontSize: 13,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  senderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  senderLabel: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  senderAddress: {
    fontSize: 15,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
    maxWidth: "60%",
    textAlign: "right",
  },
  detailValueMono: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  detailValueHighlight: {
    fontSize: 15,
    fontFamily: fonts.heading,
    color: colors.secondary,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  acceptButton: {
    backgroundColor: colors.secondary,
    borderRadius: 14,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  acceptButtonText: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  declineButton: {
    borderRadius: 14,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  declineButtonText: {
    fontSize: 15,
    fontFamily: fonts.bodyMedium,
    color: colors.textMuted,
  },
});
