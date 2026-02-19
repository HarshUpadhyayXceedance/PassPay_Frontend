import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTickets } from "../../hooks/useTickets";
import { useWallet } from "../../hooks/useWallet";
import { apiTransferTicket } from "../../services/api/eventApi";
import { formatSOL, shortenAddress } from "../../utils/formatters";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/;

function isValidSolanaAddress(address: string): boolean {
  if (address.length < 32 || address.length > 44) return false;
  return BASE58_REGEX.test(address);
}

export function TransferTicketScreen() {
  const router = useRouter();
  const { ticketKey } = useLocalSearchParams<{ ticketKey: string }>();
  const { tickets } = useTickets();
  const { publicKey } = useWallet();

  const [recipientAddress, setRecipientAddress] = useState("");
  const [transferring, setTransferring] = useState(false);

  const ticket = useMemo(
    () => tickets.find((t) => t.publicKey === ticketKey),
    [tickets, ticketKey]
  );

  const addressValid = useMemo(
    () => recipientAddress.length > 0 && isValidSolanaAddress(recipientAddress),
    [recipientAddress]
  );

  const addressError = useMemo(() => {
    if (recipientAddress.length === 0) return null;
    if (!BASE58_REGEX.test(recipientAddress)) return "Invalid base58 characters";
    if (recipientAddress.length < 32 || recipientAddress.length > 44)
      return "Address must be 32-44 characters";
    if (ticket && recipientAddress === ticket.owner)
      return "Cannot transfer to yourself";
    return null;
  }, [recipientAddress, ticket]);

  const handleTransfer = async () => {
    if (!ticket || !addressValid) return;

    if (recipientAddress === ticket.owner) {
      Alert.alert("Invalid Recipient", "You cannot transfer a ticket to yourself.");
      return;
    }

    Alert.alert(
      "Confirm Transfer",
      `Transfer this ticket to ${shortenAddress(recipientAddress, 6)}?\n\nThis action is irreversible.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Transfer",
          style: "destructive",
          onPress: async () => {
            setTransferring(true);
            try {
              await apiTransferTicket({
                eventPda: ticket.eventKey,
                ticketMint: ticket.mint,
                recipient: recipientAddress,
              });

              const deepLink = `passpay://accept-transfer?ticketMint=${ticket.mint}&eventKey=${ticket.eventKey}&from=${publicKey}`;

              Alert.alert(
                "Transfer Successful",
                `Your ticket has been transferred to ${shortenAddress(recipientAddress, 6)}.`,
                [
                  {
                    text: "Share Link",
                    onPress: async () => {
                      try {
                        await Share.share({
                          message: `I've sent you a ticket for ${ticket.eventName || "an event"} on PassPay! Open this link to view it:\n\n${deepLink}`,
                        });
                      } catch {}
                      router.back();
                    },
                  },
                  { text: "Done", onPress: () => router.back() },
                ]
              );
            } catch (error: any) {
              Alert.alert(
                "Transfer Failed",
                error.message ?? "Failed to transfer ticket. Please try again."
              );
            } finally {
              setTransferring(false);
            }
          },
        },
      ]
    );
  };

  if (!ticket) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transfer Ticket</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="ticket-outline" size={48} color={colors.textMuted} />
          <Text style={styles.errorText}>Ticket not found</Text>
        </View>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Transfer Ticket</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Ticket Info Card */}
        <Text style={styles.sectionLabel}>TICKET DETAILS</Text>
        <View style={styles.card}>
          <View style={styles.itemRow}>
            <LinearGradient
              colors={["#6C5CE7", "#00CEC9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nftImage}
            >
              <Ionicons name="ticket" size={32} color={colors.text} />
            </LinearGradient>
            <View style={styles.itemInfo}>
              <View style={styles.ticketBadge}>
                <Text style={styles.ticketBadgeText}>NFT Ticket</Text>
              </View>
              <Text style={styles.eventName} numberOfLines={2}>
                {ticket.eventName || "Unknown Event"}
              </Text>
            </View>
          </View>

          <View style={styles.detailsDivider} />

          <View style={styles.detailRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color={colors.textMuted}
            />
            <Text style={styles.detailLabel}>Venue</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {ticket.eventVenue || "N/A"}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons
              name="pricetag-outline"
              size={16}
              color={colors.textMuted}
            />
            <Text style={styles.detailLabel}>Seat</Text>
            <Text style={styles.detailValue}>
              #{ticket.seatNumber}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons
              name="finger-print-outline"
              size={16}
              color={colors.textMuted}
            />
            <Text style={styles.detailLabel}>Mint</Text>
            <Text style={styles.detailValueMono} numberOfLines={1}>
              {shortenAddress(ticket.mint, 6)}
            </Text>
          </View>
        </View>

        {/* Recipient Address */}
        <Text style={styles.sectionLabel}>RECIPIENT WALLET</Text>
        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <View style={styles.inputIconContainer}>
              <Ionicons name="wallet-outline" size={20} color={colors.secondary} />
            </View>
            <TextInput
              style={styles.addressInput}
              placeholder="Enter Solana wallet address"
              placeholderTextColor={colors.textMuted}
              value={recipientAddress}
              onChangeText={setRecipientAddress}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={44}
              selectionColor={colors.secondary}
            />
            {recipientAddress.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setRecipientAddress("")}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>

          {addressError && (
            <View style={styles.validationRow}>
              <Ionicons
                name="alert-circle"
                size={14}
                color={colors.error}
              />
              <Text style={styles.validationError}>{addressError}</Text>
            </View>
          )}

          {addressValid && !addressError && (
            <View style={styles.validationRow}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={colors.success}
              />
              <Text style={styles.validationSuccess}>Valid Solana address</Text>
            </View>
          )}

          <Text style={styles.inputHint}>
            Paste the full Solana public key (base58, 32-44 characters)
          </Text>
        </View>

        {/* Warning */}
        <View style={styles.warningCard}>
          <Ionicons
            name="warning-outline"
            size={20}
            color={colors.warning}
          />
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningTitle}>Irreversible Action</Text>
            <Text style={styles.warningBody}>
              Ticket transfers cannot be undone. Please double-check the
              recipient address before confirming. Transferring to the wrong
              address will result in permanent loss of the ticket.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (!addressValid || transferring || !!addressError) &&
              styles.confirmButtonDisabled,
          ]}
          onPress={handleTransfer}
          disabled={!addressValid || transferring || !!addressError}
          activeOpacity={0.8}
        >
          {transferring ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <View style={styles.confirmButtonContent}>
              <Ionicons name="send" size={18} color={colors.text} />
              <Text style={styles.confirmButtonText}>Confirm Transfer</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.securedRow}>
          <Ionicons name="shield-checkmark" size={14} color={colors.textMuted} />
          <Text style={styles.securedText}>Secured by Solana Blockchain</Text>
        </View>
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
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: spacing.md,
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
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  errorText: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.textMuted,
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
    padding: spacing.md,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  nftImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
    marginLeft: 14,
  },
  ticketBadge: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  ticketBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    color: colors.primary,
  },
  eventName: {
    fontSize: 16,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textMuted,
    marginLeft: spacing.sm,
    width: 50,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: colors.text,
    textAlign: "right",
  },
  detailValueMono: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.mono,
    color: colors.textSecondary,
    textAlign: "right",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  inputIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.secondaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  addressInput: {
    flex: 1,
    height: 52,
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.text,
  },
  clearButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  validationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  validationError: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.error,
  },
  validationSuccess: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.success,
  },
  inputHint: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  warningCard: {
    flexDirection: "row",
    backgroundColor: colors.warningLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 165, 2, 0.25)",
    padding: spacing.md,
    marginTop: 20,
    gap: 12,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontFamily: fonts.headingSemiBold,
    color: colors.warning,
    marginBottom: 4,
  },
  warningBody: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.secondary,
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: fonts.heading,
    color: colors.text,
  },
  securedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    gap: 6,
  },
  securedText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
});
