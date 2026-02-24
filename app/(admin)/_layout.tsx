import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/theme/colors";
import { fonts } from "../../src/theme/fonts";

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: fonts.bodySemiBold,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarLabel: "Events",
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="check-in"
        options={{
          title: "Scanner",
          tabBarLabel: "Scanner",
          tabBarIcon: ({ color }) => (
            <Ionicons name="scan" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Wallet",
          tabBarLabel: "Wallet",
          tabBarIcon: ({ color }) => (
            <Ionicons name="wallet" size={22} color={color} />
          ),
        }}
      />
      {/* Hidden routes - not shown in tab bar */}
      <Tabs.Screen name="create-event" options={{ href: null }} />
      <Tabs.Screen name="create-admin" options={{ href: null }} />
      <Tabs.Screen name="admin-list" options={{ href: null }} />
      <Tabs.Screen name="event-details" options={{ href: null }} />
      <Tabs.Screen name="update-event" options={{ href: null }} />
      <Tabs.Screen name="refund-management" options={{ href: null }} />
      <Tabs.Screen name="release-funds" options={{ href: null }} />
      <Tabs.Screen name="register-merchant" options={{ href: null }} />
      <Tabs.Screen name="merchant-list" options={{ href: null }} />
      <Tabs.Screen name="dynamic-pricing-setup" options={{ href: null }} />
      <Tabs.Screen name="setup-badges" options={{ href: null }} />
      <Tabs.Screen name="add-seat-tier" options={{ href: null }} />
    </Tabs>
  );
}
