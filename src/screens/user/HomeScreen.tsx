import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useWallet } from "../../hooks/useWallet";
import { useEvents } from "../../hooks/useEvents";
import { useTickets } from "../../hooks/useTickets";
import { useMerchants } from "../../hooks/useMerchants";
import { formatSOL } from "../../utils/formatters";
import { DynamicPriceIndicator } from "../../components/event/DynamicPriceIndicator";
import { EventDisplay } from "../../types/event";
import {
  FeaturedEventSkeleton,
  UpcomingEventSkeleton,
} from "../../components/ui/EventSkeletonLoader";
import { EmptyStateView } from "../../components/ui/EmptyStateView";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";

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
  const router = useRouter();
  const { balance, refreshBalance } = useWallet();
  const { events, fetchEvents, isLoading, error } = useEvents();
  const { fetchMyTickets } = useTickets();
  const { seatTiers, fetchSeatTiers } = useMerchants();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All Events");
  const [sortBy, setSortBy] = useState<"date" | "price" | "popularity">("date");
  const [showFilters, setShowFilters] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const carouselTimerRef = useRef<NodeJS.Timeout | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchEvents();
    fetchMyTickets();
    fetchSeatTiers();
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const onRefresh = async () => {
    await Promise.all([fetchEvents(), fetchMyTickets(), refreshBalance(), fetchSeatTiers()]);
  };

  const getEventPrice = useCallback((event: EventDisplay): number => {
    const eventTierPrices = seatTiers
      .filter((t) => t.eventKey === event.publicKey)
      .map((t) => t.price)
      .filter((p) => p > 0);
    if (eventTierPrices.length === 0) return event.currentTicketPrice || event.ticketPrice;
    const minPrice = Math.min(...eventTierPrices);
    if (event.dynamicPricingEnabled && event.baseTicketPrice > 0) {
      return minPrice * (event.currentTicketPrice / event.baseTicketPrice);
    }
    return minPrice;
  }, [seatTiers]);

  const activeEvents = useMemo(() => {
    return events.filter((e) => e.isActive);
  }, [events]);

  const filteredEvents = useMemo(() => {
    const CATEGORY_KEYWORDS: Record<string, string[]> = {
      Music: ["music", "concert", "festival", "band", "dj", "live", "song", "singer", "acoustic", "jazz", "rock", "hip hop", "rap", "edm"],
      Tech: ["tech", "conference", "hackathon", "developer", "coding", "software", "ai", "machine learning", "startup", "devcon"],
      Crypto: ["crypto", "blockchain", "web3", "solana", "nft", "defi", "token", "dao", "ethereum", "bitcoin", "mint"],
    };

    return activeEvents
      .filter((e) => {
        const matchesSearch =
          debouncedSearch.length === 0 ||
          e.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          e.venue.toLowerCase().includes(debouncedSearch.toLowerCase());

        let matchesCategory = true;
        if (activeCategory !== "All Events") {
          const keywords = CATEGORY_KEYWORDS[activeCategory] ?? [];
          const text = `${e.name} ${e.description} ${e.venue}`.toLowerCase();
          matchesCategory = keywords.some((kw) => text.includes(kw));
        }

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === "date") {
          return b.eventDate.getTime() - a.eventDate.getTime();
        } else if (sortBy === "price") {
          return getEventPrice(a) - getEventPrice(b);
        } else {
          const ratioA = a.totalSeats > 0 ? a.ticketsSold / a.totalSeats : 0;
          const ratioB = b.totalSeats > 0 ? b.ticketsSold / b.totalSeats : 0;
          return ratioB - ratioA;
        }
      });
  }, [activeEvents, debouncedSearch, sortBy, activeCategory, getEventPrice]);

  const featuredEvents = useMemo(() => {
    return filteredEvents
      .filter((e) => e.eventDate > new Date())
      .slice(0, 4);
  }, [filteredEvents]);

  useEffect(() => {
    if (carouselTimerRef.current) {
      clearInterval(carouselTimerRef.current);
      carouselTimerRef.current = null;
    }

    if (featuredEvents && featuredEvents.length > 1) {
      carouselTimerRef.current = setInterval(() => {
        setFeaturedIndex((prevIndex) => {
          const length = featuredEvents.length;
          if (!length) return prevIndex;

          const nextIndex = (prevIndex + 1) % length;
          flatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
          return nextIndex;
        });
      }, 5000);
    }

    return () => {
      if (carouselTimerRef.current) {
        clearInterval(carouselTimerRef.current);
      }
    };
  }, [featuredEvents]);

  const allUpcomingEvents = useMemo(() => {
    return filteredEvents
      .filter((e) => e.eventDate > new Date())
      .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  }, [filteredEvents]);

  const upcomingEvents = useMemo(() => {
    return showAllUpcoming ? allUpcomingEvents : allUpcomingEvents.slice(0, 8);
  }, [allUpcomingEvents, showAllUpcoming]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setFeaturedIndex(viewableItems[0].index);
      }
    },
    []
  );

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
        onPress={() => {
          router.push({ pathname: "/(user)/event-details", params: { eventKey: item.publicKey } });
        }}
        style={styles.featuredCardWrapper}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${formatShortDate(item.eventDate)}, ${formatSOL(getEventPrice(item))} SOL`}
      >
        <View style={styles.featuredCard}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.featuredImage} resizeMode="cover" />
          ) : null}
          <LinearGradient
            colors={item.imageUrl ? ["transparent", "rgba(0,0,0,0.7)"] : gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featuredGradient}
          >
            {!item.imageUrl && <View style={styles.decoCircleTopRight} />}
            {!item.imageUrl && <View style={styles.decoCircleBottomLeft} />}
            <View style={styles.badgeRow}>
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
              <DynamicPriceIndicator
                isEnabled={item.dynamicPricingEnabled}
                basePrice={item.baseTicketPrice}
                currentPrice={item.currentTicketPrice}
              />
            </View>

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
                    {formatSOL(getEventPrice(item))} SOL
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
        onPress={() => {
          router.push({ pathname: "/(user)/event-details", params: { eventKey: event.publicKey } });
        }}
        style={styles.upcomingCard}
        accessibilityRole="button"
        accessibilityLabel={`${event.name} at ${event.venue}, ${formatShortDate(event.eventDate)}`}
      >
        {event.imageUrl ? (
          <Image
            source={{ uri: event.imageUrl }}
            style={styles.upcomingThumb}
            resizeMode="cover"
          />
        ) : (
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
        )}

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

        <View style={styles.upcomingRight}>
          <DynamicPriceIndicator
            isEnabled={event.dynamicPricingEnabled}
            basePrice={event.baseTicketPrice}
            currentPrice={event.currentTicketPrice}
          />
          <Text style={styles.upcomingPrice}>
            {formatSOL(getEventPrice(event))} SOL
          </Text>
          <TouchableOpacity
            style={[
              styles.buyButton,
              event.isSoldOut && styles.buyButtonDisabled,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              if (!event.isSoldOut) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: "/(user)/buy-ticket", params: { eventKey: event.publicKey } });
              }
            }}
            activeOpacity={0.7}
            disabled={event.isSoldOut}
            accessibilityRole="button"
            accessibilityLabel={event.isSoldOut ? "Sold out" : `Buy ticket for ${event.name}`}
            accessibilityState={{ disabled: event.isSoldOut }}
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
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require("../../../assets/icon.png")}
              style={styles.headerLogo}
            />
            <View>
              <Text style={styles.headerRole}>Explorer</Text>
              <Text style={styles.headerSub}>Discover Events</Text>
            </View>
          </View>
          <View style={styles.balancePill}>
            <View style={styles.balanceDot} />
            <Text style={styles.balanceText}>
              {formatSOL(balance ?? 0)} SOL
            </Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Find events, artists..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            selectionColor={colors.accent}
            accessibilityLabel="Search events"
            accessibilityHint="Type to filter events by name or venue"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <Ionicons name="close" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.roomsBanner}
          activeOpacity={0.8}
          onPress={() => router.push("/(user)/community-rooms")}
        >
          <LinearGradient
            colors={["#6C5CE7", "#a855f7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.roomsBannerGradient}
          >
            <View style={styles.roomsBannerLeft}>
              <Text style={styles.roomsBannerTitle}>Community Rooms</Text>
              <Text style={styles.roomsBannerSub}>
                Audio + text spaces for Solana users
              </Text>
            </View>
            <Ionicons name="mic" size={32} color="rgba(255,255,255,0.85)" style={styles.roomsBannerIcon} />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured</Text>
            <View style={styles.sectionTitleBar} />
          </View>

          {isLoading ? (
            <View style={styles.featuredList}>
              <FeaturedEventSkeleton />
              <FeaturedEventSkeleton />
            </View>
          ) : featuredEvents.length === 0 ? (
            <View style={styles.emptyFeatured}>
              <EmptyStateView
                ionicon="calendar-outline"
                title="No Events Found"
                message={
                  debouncedSearch
                    ? `No events match "${debouncedSearch}". Try a different search.`
                    : "There are no featured events at the moment. Check back soon!"
                }
              />
            </View>
          ) : (
            <>
              <FlatList
                ref={flatListRef}
                data={featuredEvents}
                renderItem={renderFeaturedCard}
                keyExtractor={(item) => item.publicKey}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredList}
                snapToInterval={FEATURED_CARD_WIDTH + 16}
                decelerationRate="fast"
                pagingEnabled={false}
                onScrollToIndexFailed={(info) => {
                  const wait = new Promise((resolve) => setTimeout(resolve, 500));
                  wait.then(() => {
                    flatListRef.current?.scrollToIndex({
                      index: info.index,
                      animated: true,
                    });
                  });
                }}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{
                  itemVisiblePercentThreshold: 50,
                }}
              />

              {featuredEvents.length > 1 && (
                <View style={styles.paginationDots}>
                  {featuredEvents.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        index === featuredIndex && styles.dotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.filterSection}>
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
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`Filter by ${cat}`}
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

          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => {
              if (sortBy === "date") setSortBy("price");
              else if (sortBy === "price") setSortBy("popularity");
              else setSortBy("date");
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${sortBy === "date" ? "date" : sortBy === "price" ? "price" : "popularity"}`}
            accessibilityHint="Tap to change sort order"
          >
            <Ionicons name="swap-vertical" size={16} color={colors.accent} />
            <Text style={styles.sortText}>
              {sortBy === "date" ? "Date" : sortBy === "price" ? "Price" : "Popular"}
            </Text>
          </TouchableOpacity>
        </View>

        {error && !isLoading && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={20} color={colors.error} />
            <View style={styles.errorBannerContent}>
              <Text style={styles.errorBannerTitle}>Connection Error</Text>
              <Text style={styles.errorBannerMessage} numberOfLines={2}>
                {error}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRefresh}
              activeOpacity={0.7}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            {allUpcomingEvents.length > 8 && (
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => setShowAllUpcoming((prev) => !prev)}
              >
                <Text style={styles.seeAllText}>
                  {showAllUpcoming ? "Show Less" : `See All (${allUpcomingEvents.length})`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {isLoading ? (
            <>
              <UpcomingEventSkeleton />
              <UpcomingEventSkeleton />
              <UpcomingEventSkeleton />
            </>
          ) : upcomingEvents.length === 0 ? (
            <View style={styles.emptyUpcoming}>
              <EmptyStateView
                ionicon="calendar-outline"
                title="No Upcoming Events"
                message="There are no upcoming events scheduled. New events will appear here when they're added."
              />
            </View>
          ) : (
            upcomingEvents.map((event, index) =>
              renderUpcomingCard(event, index)
            )
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 60,
  },

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
    gap: 12,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  headerRole: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: 1,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textSecondary,
  },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accent + "59",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  balanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accent,
    letterSpacing: 0.2,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
    height: 50,
  },
  roomsBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 14,
    overflow: "hidden",
  },
  roomsBannerGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  roomsBannerLeft: {
    flex: 1,
  },
  roomsBannerTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 2,
  },
  roomsBannerSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
  },
  roomsBannerIcon: {
    marginLeft: 8,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
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
    fontFamily: fonts.heading,
    color: colors.text,
    letterSpacing: -0.3,
  },
  sectionTitleBar: {
    width: 24,
    height: 3,
    backgroundColor: colors.accent,
    borderRadius: 2,
    marginLeft: 8,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accent,
  },

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
    borderColor: colors.surfaceLight,
  },
  featuredImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
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
    fontFamily: fonts.heading,
    color: colors.text,
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
    backgroundColor: colors.accent + "33",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featuredPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
  },

  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceLight,
  },
  dotActive: {
    width: 20,
    backgroundColor: colors.accent,
  },

  badgeRow: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  badge: {
    backgroundColor: colors.accent + "E6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeSoldOut: {
    backgroundColor: colors.error + "E6",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 1,
  },

  filterSection: {
    marginBottom: 24,
    paddingRight: 20,
  },
  chipScrollView: {
    marginBottom: 0,
  },
  chipRow: {
    paddingLeft: 20,
    paddingRight: 10,
    gap: 10,
  },
  sortButton: {
    position: "absolute",
    right: 20,
    top: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  sortText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  chipActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.accent,
  },

  upcomingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
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
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  upcomingVenue: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 3,
  },
  upcomingDate: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textMuted,
  },
  upcomingRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 10,
    gap: 8,
  },
  upcomingPrice: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.accent,
  },
  buyButton: {
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  buyButtonDisabled: {
    borderColor: colors.surfaceLight,
    backgroundColor: colors.surfaceLight + "80",
  },
  buyButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.accent,
  },
  buyButtonTextDisabled: {
    color: colors.textMuted,
  },

  emptyFeatured: {
    height: FEATURED_CARD_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  emptyUpcoming: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textMuted,
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error + "4D",
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 14,
    gap: 10,
  },
  errorBannerContent: {
    flex: 1,
  },
  errorBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.error,
    marginBottom: 2,
    fontFamily: fonts.bodySemiBold,
  },
  errorBannerMessage: {
    fontSize: 12,
    color: colors.error + "CC",
    fontFamily: fonts.body,
  },
  retryButton: {
    backgroundColor: colors.error + "33",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.error,
    fontFamily: fonts.bodySemiBold,
  },
});
