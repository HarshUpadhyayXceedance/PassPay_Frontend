import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTickets } from "../../hooks/useTickets";
import { useEvents } from "../../hooks/useEvents";
import { useWallet } from "../../hooks/useWallet";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";
import { shortenAddress, formatSOL } from "../../utils/formatters";

export function AcceptTransferScreen() {
  const router = useRouter();
  const { ticketMint, eventKey, from } = useLocalSearchParams<{
    ticketMint: string;
    eventKey: string;
    from: string;
  }>();
  const { publicKey, refreshBalance } = useWallet();
  const { getEvent } = useEvents();
  const [accepting, setAccepting] = useState(false);

  const event = getEvent(eventKey as string);

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
      // In a real implementation, this would verify the transfer on-chain
      // and confirm the token has been received
      await refreshBalance();
      Alert.alert(
        "Transfer Accepted!",
        "The ticket has been added to your wallet. You can view it in My Passes.",
        [
          {
            text: "View My Passes",
            onPress: () => router.replace("/(user)/my-passes"),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Failed to accept transfer");
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      "Decline Transfer?",
      "The ticket will remain with the sender.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
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
        {/* Transfer Icon */}
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
        </View>

        {/* Sender Info */}
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

        {/* Ticket Details */}
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

        {/* Receiving to */}
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

      {/* Bottom Actions */}
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
