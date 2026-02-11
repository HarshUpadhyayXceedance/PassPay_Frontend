import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useEvents } from "../../hooks/useEvents";
import { useWallet } from "../../hooks/useWallet";
import { apiBuyTicket } from "../../services/api/eventApi";
import { formatSOL } from "../../utils/formatters";
import { UserStackParamList } from "../../types/navigation";

type Nav = NativeStackNavigationProp<UserStackParamList, "BuyTicket">;
type Route = RouteProp<UserStackParamList, "BuyTicket">;

const NETWORK_FEE = 0.000005;

export function BuyTicketScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { getEvent } = useEvents();
  const { balance, refreshBalance } = useWallet();
  const [buying, setBuying] = useState(false);

  const event = getEvent(route.params.eventKey);

  if (!event) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backArrow}>{"\u2190"}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Order</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Event not found</Text>
        </View>
      </View>
    );
  }

  const subtotal = event.ticketPrice;
  const total = subtotal + NETWORK_FEE;
  const canAfford = balance >= total;

  const handleBuy = async () => {
    if (!canAfford) {
      Alert.alert("Insufficient Funds", "You don't have enough SOL.");
      return;
    }

    setBuying(true);
    try {
      const metadataUri = `https://arweave.net/placeholder-${Date.now()}`;
      const result = await apiBuyTicket(event.publicKey, metadataUri);
      await refreshBalance();
      Alert.alert("Success", `Ticket purchased! Mint: ${result.mint}`, [
        { text: "View Ticket", onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Failed to buy ticket");
    } finally {
      setBuying(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backArrow}>{"\u2190"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Order</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Item Details */}
        <Text style={styles.sectionLabel}>ITEM DETAILS</Text>
        <View style={styles.card}>
          <View style={styles.itemRow}>
            <LinearGradient
              colors={["#6C5CE7", "#00CEC9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nftImage}
            />
            <View style={styles.itemInfo}>
              <View style={styles.badgeContainer}>
                <View style={styles.vipBadge}>
                  <Text style={styles.vipBadgeText}>VIP Access NFT</Text>
                </View>
              </View>
              <Text style={styles.eventName} numberOfLines={2}>
                {event.name}
              </Text>
              <Text style={styles.priceGreen}>
                {formatSOL(event.ticketPrice)} SOL
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
        <View style={styles.card}>
          <View style={styles.paymentRow}>
            <View style={styles.walletIconContainer}>
              <Text style={styles.walletIcon}>{"\uD83D\uDCB3"}</Text>
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentTitle}>Local Wallet</Text>
              <Text style={styles.paymentBalance}>
                Balance: {formatSOL(balance)} SOL
              </Text>
            </View>
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>{"\u2713"}</Text>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <Text style={styles.sectionLabel}>ORDER SUMMARY</Text>
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              {formatSOL(subtotal)} SOL
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.networkFeeLabel}>
              <Text style={styles.summaryLabel}>Network Fee</Text>
              <View style={styles.solanaBadge}>
                <Text style={styles.solanaBadgeText}>Solana</Text>
              </View>
            </View>
            <Text style={styles.summaryValue}>
              {formatSOL(NETWORK_FEE)} SOL
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatSOL(total)} SOL</Text>
          </View>
        </View>

        {!canAfford && (
          <Text style={styles.warningText}>
            Insufficient balance. You need {formatSOL(total - balance)} more
            SOL.
          </Text>
        )}
      </ScrollView>

      {/* Bottom */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (buying || !canAfford) && styles.confirmButtonDisabled,
          ]}
          onPress={handleBuy}
          disabled={buying || !canAfford}
          activeOpacity={0.8}
        >
          {buying ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Payment</Text>
          )}
        </TouchableOpacity>
        <View style={styles.securedRow}>
          <Text style={styles.shieldIcon}>{"\uD83D\uDEE1\uFE0F"}</Text>
          <Text style={styles.securedText}>Secured by Solana Blockchain</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0E1A",
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
    backgroundColor: "#141829",
    borderWidth: 1,
    borderColor: "#1E2235",
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 20,
    color: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 15,
    color: "#8F95B2",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8F95B2",
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#141829",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E2235",
    padding: 16,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  nftImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 14,
  },
  badgeContainer: {
    flexDirection: "row",
    marginBottom: 6,
  },
  vipBadge: {
    backgroundColor: "rgba(108, 92, 231, 0.2)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  vipBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6C5CE7",
  },
  eventName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  priceGreen: {
    fontSize: 15,
    fontWeight: "700",
    color: "#00CEC9",
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  walletIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0, 206, 201, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  walletIcon: {
    fontSize: 20,
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  paymentBalance: {
    fontSize: 13,
    color: "#8F95B2",
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#00CEC9",
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#8F95B2",
  },
  summaryValue: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  networkFeeLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  solanaBadge: {
    backgroundColor: "rgba(0, 206, 201, 0.12)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  solanaBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#00CEC9",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#1E2235",
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#00CEC9",
  },
  warningText: {
    fontSize: 13,
    color: "#FF6B6B",
    textAlign: "center",
    marginTop: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "#1E2235",
  },
  confirmButton: {
    backgroundColor: "#00CEC9",
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  securedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  shieldIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  securedText: {
    fontSize: 12,
    color: "#8F95B2",
  },
});
