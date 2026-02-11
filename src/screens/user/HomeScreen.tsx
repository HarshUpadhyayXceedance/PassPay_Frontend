import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  Dimensions,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useWallet } from "../../hooks/useWallet";
import { useEvents } from "../../hooks/useEvents";
import { useTickets } from "../../hooks/useTickets";
import { shortenAddress, formatSOL } from "../../utils/formatters";
import { formatDate } from "../../utils/formatters";
import { UserStackParamList } from "../../types/navigation";
import { EventDisplay } from "../../types/event";

type Nav = NativeStackNavigationProp<UserStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FEATURED_CARD_WIDTH = SCREEN_WIDTH * 0.72;
const FEATURED_CARD_HEIGHT = 220;
const UPCOMING_THUMB_SIZE = 72;

const CATEGORIES = ["All Events", "Music", "Tech", "Crypto"] as const;

const GRADIENT_PALETTES: [string, string, string][] = [
  ["#6C5CE7", "#a855f7", "#3b0764"],
  ["#00CEC9", "#0891b2", "#164e63"],
  ["#e17055", "#f97316", "#7c2d12"],
  ["#fd79a8", "#ec4899", "#831843"],
  ["#0984e3", "#6366f1", "#312e81"],
];

const BADGE_LABELS = ["SELLING FAST", "NEW", "HOT", "LIMITED"];

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { balance, refreshBalance } = useWallet();
  const { events, fetchEvents, isLoading } = useEvents();
  const { fetchMyTickets } = useTickets();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All Events");

  useEffect(() => {
    fetchEvents();
    fetchMyTickets();
  }, []);

  const onRefresh = async () => {
    await Promise.all([fetchEvents(), fetchMyTickets(), refreshBalance()]);
  };

  const activeEvents = events.filter((e) => e.isActive);

  const filteredEvents = activeEvents.filter((e) => {
    const matchesSearch =
      searchQuery.length === 0 ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.venue.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const featuredEvents = filteredEvents
    .filter((e) => e.eventDate > new Date())
    .slice(0, 6);

  const upcomingEvents = filteredEvents
    .filter((e) => e.eventDate > new Date())
    .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())
    .slice(0, 8);

  const getGradient = (index: number): [string, string, string] =>
    GRADIENT_PALETTES[index % GRADIENT_PALETTES.length];

  const getBadge = (event: EventDisplay, index: number): string | null => {
    if (event.isSoldOut) return "SOLD OUT";
    const ratio = event.ticketsSold / event.totalSeats;
    if (ratio > 0.75) return "SELLING FAST";
    if (index < 2) return BADGE_LABELS[index % BADGE_LABELS.length];
    return null;
  };

  const formatShortDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderFeaturedCard = ({
    item,
    index,
  }: {
    item: EventDisplay;
    index: number;
  }) => {
    const gradient = getGradient(index);
    const badge = getBadge(item, index);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("EventDetails", { eventKey: item.publicKey })
        }
        style={styles.featuredCardWrapper}
      >
        <View style={styles.featuredCard}>
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featuredGradient}
          >
            {/* Decorative circles */}
            <View style={styles.decoCircleTopRight} />
            <View style={styles.decoCircleBottomLeft} />

            {/* Badge */}
            {badge && (
              <View
                style={[
                  styles.badge,
                  badge === "SOLD OUT" && styles.badgeSoldOut,
                ]}
              >
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            )}

            {/* Bottom overlay */}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.7)"]}
              style={styles.featuredOverlay}
            >
              <Text style={styles.featuredEventName} numberOfLines={2}>
                {item.name}
              </Text>
              <View style={styles.featuredMeta}>
                <Text style={styles.featuredDate}>
                  {formatShortDate(item.eventDate)}
                </Text>
                <View style={styles.featuredPricePill}>
                  <Text style={styles.featuredPrice}>
                    {formatSOL(item.ticketPrice)} SOL
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    );
  };

  const renderUpcomingCard = (event: EventDisplay, index: number) => {
    const gradient = getGradient(index + 2);

    return (
      <TouchableOpacity
        key={event.publicKey}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate("EventDetails", { eventKey: event.publicKey })
        }
        style={styles.upcomingCard}
      >
        {/* Thumbnail */}
        <LinearGradient
          colors={[gradient[0], gradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.upcomingThumb}
        >
          <Text style={styles.upcomingThumbInitial}>
            {event.name.charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>

        {/* Info */}
        <View style={styles.upcomingInfo}>
          <Text style={styles.upcomingName} numberOfLines={1}>
            {event.name}
          </Text>
          <Text style={styles.upcomingVenue} numberOfLines={1}>
            {event.venue}
          </Text>
          <Text style={styles.upcomingDate}>
            {formatShortDate(event.eventDate)}
          </Text>
        </View>

        {/* Right side: price + buy */}
        <View style={styles.upcomingRight}>
          <Text style={styles.upcomingPrice}>
            {formatSOL(event.ticketPrice)} SOL
          </Text>
          <TouchableOpacity
            style={[
              styles.buyButton,
              event.isSoldOut && styles.buyButtonDisabled,
            ]}
            onPress={() => {
              if (!event.isSoldOut) {
                navigation.navigate("BuyTicket", { eventKey: event.publicKey });
              }
            }}
            activeOpacity={0.7}
            disabled={event.isSoldOut}
          >
            <Text
              style={[
                styles.buyButtonText,
                event.isSoldOut && styles.buyButtonTextDisabled,
              ]}
            >
              {event.isSoldOut ? "Sold" : "Buy"}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor="#00CEC9"
            colors={["#00CEC9"]}
          />
        }
      >
        {/* ========== HEADER ========== */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.logoText}>Pass</Text>
            <Text style={styles.logoAccent}>Pay</Text>
          </View>
          <View style={styles.balancePill}>
            <View style={styles.balanceDot} />
            <Text style={styles.balanceText}>
              {formatSOL(balance ?? 0)} SOL
            </Text>
          </View>
        </View>

        {/* ========== SEARCH BAR ========== */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>&#x1F50D;</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Find events, artists..."
            placeholderTextColor="#4A5068"
            value={searchQuery}
            onChangeText={setSearchQuery}
            selectionColor="#00CEC9"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>x</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ========== FEATURED SECTION ========== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured</Text>
            <View style={styles.sectionTitleBar} />
          </View>

          {featuredEvents.length === 0 ? (
            <View style={styles.emptyFeatured}>
              <Text style={styles.emptyText}>No featured events found</Text>
            </View>
          ) : (
            <FlatList
              data={featuredEvents}
              renderItem={renderFeaturedCard}
              keyExtractor={(item) => item.publicKey}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredList}
              snapToInterval={FEATURED_CARD_WIDTH + 16}
              decelerationRate="fast"
            />
          )}
        </View>

        {/* ========== CATEGORY CHIPS ========== */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScrollView}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.chipText, isActive && styles.chipTextActive]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ========== UPCOMING SECTION ========== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            <TouchableOpacity activeOpacity={0.6}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {upcomingEvents.length === 0 ? (
            <View style={styles.emptyUpcoming}>
              <Text style={styles.emptyText}>No upcoming events</Text>
            </View>
          ) : (
            upcomingEvents.map((event, index) =>
              renderUpcomingCard(event, index)
            )
          )}
        </View>

        {/* Bottom spacer for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0E1A",
  },
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 60,
  },

  /* ---- Header ---- */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  logoAccent: {
    fontSize: 26,
    fontWeight: "800",
    color: "#00CEC9",
    letterSpacing: -0.5,
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 206, 201, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(0, 206, 201, 0.35)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  balanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00CEC9",
  },
  balanceText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00CEC9",
    letterSpacing: 0.2,
  },

  /* ---- Search ---- */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141829",
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: "#1E2235",
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
    opacity: 0.5,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
    height: 50,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1E2235",
    justifyContent: "center",
    alignItems: "center",
  },
  clearButtonText: {
    color: "#8F95B2",
    fontSize: 13,
    fontWeight: "600",
  },

  /* ---- Sections ---- */
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  sectionTitleBar: {
    width: 24,
    height: 3,
    backgroundColor: "#00CEC9",
    borderRadius: 2,
    marginLeft: 8,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00CEC9",
  },

  /* ---- Featured Cards ---- */
  featuredList: {
    paddingLeft: 20,
    paddingRight: 4,
  },
  featuredCardWrapper: {
    marginRight: 16,
  },
  featuredCard: {
    width: FEATURED_CARD_WIDTH,
    height: FEATURED_CARD_HEIGHT,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1E2235",
  },
  featuredGradient: {
    flex: 1,
    justifyContent: "flex-end",
    position: "relative",
  },
  decoCircleTopRight: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  decoCircleBottomLeft: {
    position: "absolute",
    bottom: 30,
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  featuredOverlay: {
    padding: 16,
    paddingTop: 40,
  },
  featuredEventName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  featuredMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featuredDate: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.75)",
  },
  featuredPricePill: {
    backgroundColor: "rgba(0, 206, 201, 0.2)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featuredPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#00CEC9",
  },

  /* ---- Badge ---- */
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0, 206, 201, 0.9)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeSoldOut: {
    backgroundColor: "rgba(214, 48, 49, 0.9)",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },

  /* ---- Category Chips ---- */
  chipScrollView: {
    marginBottom: 24,
  },
  chipRow: {
    paddingHorizontal: 20,
    gap: 10,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#141829",
    borderWidth: 1,
    borderColor: "#1E2235",
  },
  chipActive: {
    backgroundColor: "rgba(0, 206, 201, 0.12)",
    borderColor: "#00CEC9",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8F95B2",
  },
  chipTextActive: {
    color: "#00CEC9",
  },

  /* ---- Upcoming Cards ---- */
  upcomingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141829",
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1E2235",
  },
  upcomingThumb: {
    width: UPCOMING_THUMB_SIZE,
    height: UPCOMING_THUMB_SIZE,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  upcomingThumbInitial: {
    fontSize: 26,
    fontWeight: "800",
    color: "rgba(255,255,255,0.8)",
  },
  upcomingInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  upcomingName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  upcomingVenue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#8F95B2",
    marginBottom: 3,
  },
  upcomingDate: {
    fontSize: 12,
    fontWeight: "500",
    color: "#555B74",
  },
  upcomingRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 10,
    gap: 8,
  },
  upcomingPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#00CEC9",
  },
  buyButton: {
    backgroundColor: "rgba(0, 206, 201, 0.12)",
    borderWidth: 1,
    borderColor: "#00CEC9",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  buyButtonDisabled: {
    borderColor: "#1E2235",
    backgroundColor: "rgba(30, 34, 53, 0.5)",
  },
  buyButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#00CEC9",
  },
  buyButtonTextDisabled: {
    color: "#555B74",
  },

  /* ---- Empty States ---- */
  emptyFeatured: {
    height: FEATURED_CARD_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 20,
    backgroundColor: "#141829",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1E2235",
  },
  emptyUpcoming: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 20,
    backgroundColor: "#141829",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E2235",
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555B74",
  },
});
