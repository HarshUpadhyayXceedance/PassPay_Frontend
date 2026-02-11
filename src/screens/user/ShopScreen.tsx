import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.6;

const categories = ["All", "Food", "Drinks", "Merch"];

const popularItems = [
  { id: "1", name: "Neon Smash Burger", vendor: "Tasty Bites", price: 0.35, wait: "10 min wait", color: ["#FF6B6B", "#EE5A24"] },
  { id: "2", name: "Galaxy Lemonade", vendor: "SolBar", price: 0.12, wait: "Instant", color: ["#6C5CE7", "#A29BFE"] },
  { id: "3", name: "Crypto Cookie", vendor: "CryptoCorn", price: 0.08, wait: "5 min wait", color: ["#00CEC9", "#00B894"] },
];

const vendors = [
  { id: "1", name: "Tasty Bites", category: "Burgers & Fries", rating: 4.8, reviews: 120 },
  { id: "2", name: "SolBar", category: "Cocktails & Drinks", rating: 4.9, reviews: 342 },
  { id: "3", name: "Official Merch", category: "Clothing & Accessories", rating: 5.0, reviews: 85 },
  { id: "4", name: "CryptoCorn", category: "Popcorn & Snacks", rating: 4.5, reviews: 56 },
];

export function ShopScreen() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Event Shop</Text>
        <View style={styles.cartButton}>
          <Text style={styles.cartIcon}>🛒</Text>
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>2</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Find food, drinks, or merch..."
          placeholderTextColor="#4A4E69"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, activeCategory === cat && styles.chipActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Popular Now */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Popular Now</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        data={popularItems}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.popularList}
        renderItem={({ item }) => (
          <View style={styles.popularCard}>
            <LinearGradient
              colors={item.color as [string, string]}
              style={styles.popularImage}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.vendorBadge}>
                <Text style={styles.vendorBadgeText}>{item.vendor}</Text>
              </View>
            </LinearGradient>
            <Text style={styles.popularName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.popularFooter}>
              <Text style={styles.popularWait}>⏱ {item.wait}</Text>
            </View>
            <View style={styles.popularPriceRow}>
              <Text style={styles.popularPrice}>{item.price} SOL</Text>
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* All Vendors */}
      <Text style={styles.sectionTitle}>All Vendors</Text>
      {vendors.map((vendor) => (
        <View key={vendor.id} style={styles.vendorRow}>
          <LinearGradient
            colors={["#1E2235", "#2D3154"]}
            style={styles.vendorAvatar}
          >
            <Text style={styles.vendorInitial}>{vendor.name[0]}</Text>
          </LinearGradient>
          <View style={styles.vendorInfo}>
            <Text style={styles.vendorName}>{vendor.name}</Text>
            <Text style={styles.vendorCategory}>{vendor.category}</Text>
            <Text style={styles.vendorRating}>
              ⭐ {vendor.rating} ({vendor.reviews} reviews)
            </Text>
          </View>
          <TouchableOpacity style={styles.payButton}>
            <Text style={styles.payButtonText}>Pay</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0E1A",
  },
  content: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cartButton: {
    position: "relative",
  },
  cartIcon: {
    fontSize: 24,
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#00CEC9",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    color: "#0A0E1A",
    fontSize: 11,
    fontWeight: "700",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141829",
    borderRadius: 14,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: "#1E2235",
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
  },
  categories: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#141829",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#1E2235",
  },
  chipActive: {
    backgroundColor: "#00CEC9",
    borderColor: "#00CEC9",
  },
  chipText: {
    color: "#8F95B2",
    fontSize: 14,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#0A0E1A",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  seeAll: {
    color: "#00CEC9",
    fontSize: 14,
    fontWeight: "600",
  },
  popularList: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  popularCard: {
    width: CARD_WIDTH,
    marginRight: 14,
    backgroundColor: "#141829",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E2235",
    overflow: "hidden",
  },
  popularImage: {
    height: 140,
    justifyContent: "flex-start",
    padding: 10,
  },
  vendorBadge: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  vendorBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  popularName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  popularFooter: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  popularWait: {
    color: "#8F95B2",
    fontSize: 13,
  },
  popularPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  popularPrice: {
    color: "#00CEC9",
    fontSize: 16,
    fontWeight: "700",
  },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1E2235",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  vendorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1E2235",
  },
  vendorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  vendorInitial: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  vendorInfo: {
    flex: 1,
    marginLeft: 14,
  },
  vendorName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  vendorCategory: {
    color: "#8F95B2",
    fontSize: 13,
    marginTop: 2,
  },
  vendorRating: {
    color: "#8F95B2",
    fontSize: 13,
    marginTop: 2,
  },
  payButton: {
    backgroundColor: "#00CEC9",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  payButtonText: {
    color: "#0A0E1A",
    fontSize: 14,
    fontWeight: "700",
  },
});
