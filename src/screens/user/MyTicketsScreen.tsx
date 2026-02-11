import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useTickets } from "../../hooks/useTickets";
import { TicketDisplay } from "../../types/ticket";
import { UserStackParamList } from "../../types/navigation";
import { formatDate } from "../../utils/formatters";

type Nav = NativeStackNavigationProp<UserStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_HORIZONTAL_PADDING = 20;
const CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_PADDING * 2;
const IMAGE_HEIGHT = 180;

const COLORS = {
  background: "#0A0E1A",
  card: "#141829",
  green: "#00CEC9",
  text: "#FFFFFF",
  secondary: "#8F95B2",
  tabInactive: "#1C2038",
};

const GRADIENTS: [string, string][] = [
  ["#6C5CE7", "#00CEC9"],
  ["#E17055", "#FDCB6E"],
  ["#0984E3", "#6C5CE7"],
  ["#00B894", "#00CEC9"],
  ["#E84393", "#FD79A8"],
];

type TabKey = "upcoming" | "past";

export function MyTicketsScreen() {
  const navigation = useNavigation<Nav>();
  const { tickets, fetchMyTickets, isLoading } = useTickets();
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming");

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const now = new Date();

  const upcomingTickets = tickets.filter(
    (t) => new Date(t.eventDate) >= now
  );
  const pastTickets = tickets.filter(
    (t) => new Date(t.eventDate) < now
  );

  const displayedTickets =
    activeTab === "upcoming" ? upcomingTickets : pastTickets;

  const getGradient = (index: number): [string, string] =>
    GRADIENTS[index % GRADIENTS.length];

  const renderPassCard = ({
    item,
    index,
  }: {
    item: TicketDisplay;
    index: number;
  }) => {
    const gradient = getGradient(index);

    return (
      <View style={styles.card}>
        {/* Image area with gradient placeholder */}
        <View style={styles.imageContainer}>
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientImage}
          />

          {/* VALID badge */}
          <View style={styles.validBadge}>
            <Text style={styles.validBadgeText}>VALID</Text>
          </View>

          {/* ProofPass number badge */}
          <View style={styles.proofPassBadge}>
            <Text style={styles.proofPassText}>
              ProofPass #{item.seatNumber}
            </Text>
          </View>
        </View>

        {/* Card content */}
        <View style={styles.cardContent}>
          <Text style={styles.eventName} numberOfLines={2}>
            {item.eventName}
          </Text>

          {/* Date row */}
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <Text style={styles.infoText}>{formatDate(item.eventDate)}</Text>
          </View>

          {/* Venue row */}
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <Text style={styles.infoText}>{item.eventVenue}</Text>
          </View>

          {/* Bottom action row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.qrButton}
              onPress={() =>
                navigation.navigate("TicketQR", {
                  ticketKey: item.publicKey,
                })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.qrButtonText}>Show Ticket QR</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareButton} activeOpacity={0.7}>
              <Text style={styles.shareIcon}>↗</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Passes</Text>
        <TouchableOpacity style={styles.historyButton} activeOpacity={0.7}>
          <Text style={styles.historyIcon}>🕘</Text>
        </TouchableOpacity>
      </View>

      {/* Tab toggle */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "upcoming" ? styles.tabActive : styles.tabInactive,
          ]}
          onPress={() => setActiveTab("upcoming")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "upcoming"
                ? styles.tabTextActive
                : styles.tabTextInactive,
            ]}
          >
            Upcoming ({upcomingTickets.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "past" ? styles.tabActive : styles.tabInactive,
          ]}
          onPress={() => setActiveTab("past")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "past"
                ? styles.tabTextActive
                : styles.tabTextInactive,
            ]}
          >
            Past Events
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pass list */}
      <FlatList
        data={displayedTickets}
        renderItem={renderPassCard}
        keyExtractor={(item) => item.publicKey}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchMyTickets}
            tintColor={COLORS.green}
          />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {activeTab === "upcoming"
                  ? "No Upcoming Passes"
                  : "No Past Events"}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === "upcoming"
                  ? "Browse events and grab your first pass"
                  : "Your attended events will appear here"}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /* ---- Header ---- */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
  },
  historyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  historyIcon: {
    fontSize: 20,
  },

  /* ---- Tab toggle ---- */
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: COLORS.tabInactive,
    borderRadius: 28,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: COLORS.green,
  },
  tabInactive: {
    backgroundColor: "transparent",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabTextActive: {
    color: COLORS.background,
  },
  tabTextInactive: {
    color: COLORS.secondary,
  },

  /* ---- List ---- */
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  /* ---- Pass card ---- */
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: IMAGE_HEIGHT,
    position: "relative",
  },
  gradientImage: {
    ...StyleSheet.absoluteFillObject,
  },
  validBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  validBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.background,
    letterSpacing: 0.5,
  },
  proofPassBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(10,14,26,0.70)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  proofPassText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.green,
  },

  /* ---- Card content ---- */
  cardContent: {
    padding: 16,
  },
  eventName: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.secondary,
  },

  /* ---- Action row ---- */
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  qrButton: {
    flex: 1,
    backgroundColor: COLORS.green,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  qrButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.background,
  },
  shareButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(143,149,178,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  shareIcon: {
    fontSize: 20,
    color: COLORS.text,
  },

  /* ---- Empty state ---- */
  emptyContainer: {
    alignItems: "center",
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
