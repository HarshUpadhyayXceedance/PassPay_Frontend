import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useEvents } from "../../hooks/useEvents";
import { formatDate, formatSOL } from "../../utils/formatters";
import { UserStackParamList } from "../../types/navigation";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = 280;

const COLORS = {
  background: "#0A0E1A",
  card: "#141829",
  border: "#1E2235",
  green: "#00CEC9",
  text: "#FFFFFF",
  secondary: "#8F95B2",
};

type Nav = NativeStackNavigationProp<UserStackParamList, "EventDetails">;
type Route = RouteProp<UserStackParamList, "EventDetails">;

function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function EventDetailsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { getEvent } = useEvents();

  const event = getEvent(route.params.eventKey);

  if (!event) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Event not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const seatsLeft = event.availableSeats;
  const isLowSeats = seatsLeft > 0 && seatsLeft < 50;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ============ HERO IMAGE AREA ============ */}
        <View style={styles.heroContainer}>
          <View style={styles.heroPlaceholder}>
            <LinearGradient
              colors={["transparent", "rgba(10,14,26,0.65)", COLORS.background]}
              locations={[0.2, 0.65, 1]}
              style={styles.heroGradient}
            />
          </View>

          {/* Top overlay icons */}
          <View style={styles.heroOverlay}>
            <TouchableOpacity
              style={styles.iconCircle}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.iconText}>{"<"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconCircle} activeOpacity={0.7}>
              <Text style={styles.iconText}>{"^"}</Text>
            </TouchableOpacity>
          </View>

          {/* Event name at bottom of hero */}
          <View style={styles.heroTitleContainer}>
            <Text style={styles.eventName} numberOfLines={2}>
              {event.name}
            </Text>
          </View>
        </View>

        {/* ============ INFO CHIPS ROW ============ */}
        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Text style={styles.chipIcon}>📅</Text>
            <Text style={styles.chipText}>{formatDate(event.eventDate)}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipIcon}>📍</Text>
            <Text style={styles.chipText} numberOfLines={1}>
              {event.venue}
            </Text>
          </View>
        </View>

        {/* ============ ORGANIZED BY ============ */}
        <View style={styles.section}>
          <View style={styles.organizedCard}>
            <Text style={styles.organizedLabel}>Organized by</Text>
            <Text style={styles.organizedAddress}>
              {shortenAddress(event.admin, 6)}
            </Text>
          </View>
        </View>

        {/* ============ STATS ROW ============ */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Capacity</Text>
            <Text style={styles.statValue}>{event.totalSeats}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Ticket Type</Text>
            <Text style={styles.statValue}>NFT Pass</Text>
          </View>
        </View>

        {/* ============ ABOUT EVENT ============ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Event</Text>
          <Text style={styles.descriptionText}>
            Join us for an unforgettable experience at {event.name}. This event
            brings together enthusiasts and newcomers alike for a day of
            discovery, connection, and inspiration. Immerse yourself in the
            atmosphere, meet like-minded individuals, and create memories that
            will last a lifetime. Every ticket is minted as a unique NFT on
            Solana, giving you verifiable proof of attendance and exclusive
            on-chain benefits.
          </Text>
        </View>

        {/* ============ LOCATION ============ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderIcon}>🗺️</Text>
            <Text style={styles.mapPlaceholderText}>{event.venue}</Text>
          </View>
        </View>

        {/* Spacer for bottom bar */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ============ BOTTOM STICKY BAR ============ */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomLeft}>
          {seatsLeft > 0 && (
            <View
              style={[
                styles.seatsLeftBadge,
                isLowSeats && styles.seatsLeftBadgeLow,
              ]}
            >
              <Text
                style={[
                  styles.seatsLeftText,
                  isLowSeats && styles.seatsLeftTextLow,
                ]}
              >
                Only {seatsLeft} seats left
              </Text>
            </View>
          )}
          {event.isSoldOut && (
            <View style={styles.soldOutBadge}>
              <Text style={styles.soldOutText}>Sold Out</Text>
            </View>
          )}
          <Text style={styles.totalPriceLabel}>Total Price</Text>
          <Text style={styles.totalPriceValue}>
            {formatSOL(event.ticketPrice)} SOL
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.buyButton,
            (!event.isActive || event.isSoldOut) && styles.buyButtonDisabled,
          ]}
          activeOpacity={0.8}
          disabled={!event.isActive || event.isSoldOut}
          onPress={() =>
            navigation.navigate("BuyTicket", {
              eventKey: event.publicKey,
            })
          }
        >
          <Text style={styles.buyButtonText}>Buy Ticket</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.secondary,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },

  /* ---- Hero ---- */
  heroContainer: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    position: "relative",
  },
  heroPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1B2545",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    position: "absolute",
    top: 52,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(20,24,41,0.75)",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "700",
  },
  heroTitleContainer: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },
  eventName: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    lineHeight: 32,
  },

  /* ---- Chips ---- */
  chipsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexShrink: 1,
  },
  chipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.secondary,
    fontWeight: "500",
    flexShrink: 1,
  },

  /* ---- Organized by ---- */
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  organizedCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  organizedLabel: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: "500",
  },
  organizedAddress: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "600",
    fontFamily: "monospace",
  },

  /* ---- Stats ---- */
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: "500",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    color: COLORS.text,
    fontWeight: "700",
  },

  /* ---- About ---- */
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.secondary,
    lineHeight: 22,
    fontWeight: "400",
  },

  /* ---- Location / Map ---- */
  mapPlaceholder: {
    width: "100%",
    height: 170,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPlaceholderIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  mapPlaceholderText: {
    fontSize: 13,
    color: COLORS.secondary,
    fontWeight: "500",
  },

  /* ---- Bottom Bar ---- */
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 34, // safe area
  },
  bottomLeft: {
    flexShrink: 1,
    marginRight: 12,
  },
  seatsLeftBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,206,201,0.12)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  seatsLeftBadgeLow: {
    backgroundColor: "rgba(0,206,201,0.22)",
  },
  seatsLeftText: {
    fontSize: 11,
    color: COLORS.green,
    fontWeight: "600",
  },
  seatsLeftTextLow: {
    color: COLORS.green,
  },
  soldOutBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,71,87,0.15)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  soldOutText: {
    fontSize: 11,
    color: "#FF4757",
    fontWeight: "600",
  },
  totalPriceLabel: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: "500",
    marginBottom: 2,
  },
  totalPriceValue: {
    fontSize: 20,
    color: COLORS.green,
    fontWeight: "800",
  },
  buyButton: {
    backgroundColor: COLORS.green,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buyButtonDisabled: {
    backgroundColor: "#2A3050",
  },
  buyButtonText: {
    fontSize: 15,
    color: COLORS.background,
    fontWeight: "700",
  },
});
