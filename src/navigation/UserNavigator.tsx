import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { colors } from "../theme/colors";
import { HomeScreen } from "../screens/user/HomeScreen";
import { EventListScreen } from "../screens/user/EventListScreen";
import { MyTicketsScreen } from "../screens/user/MyTicketsScreen";
import { ProfileScreen } from "../screens/common/ProfileScreen";
import { EventDetailsScreen } from "../screens/user/EventDetailsScreen";
import { BuyTicketScreen } from "../screens/user/BuyTicketScreen";
import { TicketQRScreen } from "../screens/user/TicketQRScreen";
import { ScanToPayScreen } from "../screens/user/ScanToPayScreen";
import { SettingsScreen } from "../screens/common/SettingsScreen";
import { AboutScreen } from "../screens/common/AboutScreen";
import { UserTabParamList, UserStackParamList } from "../types/navigation";

const TAB_BAR_BG = "#0A0E1A";
const TAB_BAR_BORDER = "#1A1A2E";
const ACTIVE_TINT = "#00CEC9";
const INACTIVE_TINT = colors.textMuted;
const CENTER_BUTTON_SIZE = 62;

const Tab = createBottomTabNavigator<UserTabParamList>();
const Stack = createNativeStackNavigator<UserStackParamList>();

function getTabIcon(routeName: string): string {
  switch (routeName) {
    case "Explore":
      return "\u{1F9ED}";
    case "MyPasses":
      return "\u{1F3AB}";
    case "Scan":
      return "\u{1F4F7}";
    case "Shop":
      return "\u{1F6CD}\uFE0F";
    case "Profile":
      return "\u{1F464}";
    default:
      return "\u{25CF}";
  }
}

function CenterScanButton({
  onPress,
  accessibilityState,
}: {
  onPress?: () => void;
  accessibilityState?: { selected?: boolean };
}) {
  const focused = accessibilityState?.selected ?? false;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.centerButtonWrapper}
    >
      <View
        style={[
          styles.centerButton,
          focused && styles.centerButtonFocused,
        ]}
      >
        <Text style={styles.centerButtonIcon}>{"\u{2B1A}"}</Text>
      </View>
    </TouchableOpacity>
  );
}

function UserTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: TAB_BAR_BG,
          borderTopColor: TAB_BAR_BORDER,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarActiveTintColor: ACTIVE_TINT,
        tabBarInactiveTintColor: INACTIVE_TINT,
        tabBarIcon: ({ color, size }) => {

          if (route.name === "Scan") return null;
          return (
            <Text style={{ fontSize: size ?? 22, color, textAlign: "center" }}>
              {getTabIcon(route.name)}
            </Text>
          );
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      })}
    >
      <Tab.Screen
        name="Explore"
        component={HomeScreen}
        options={{ tabBarLabel: "Explore" }}
      />
      <Tab.Screen
        name="MyPasses"
        component={MyTicketsScreen}
        options={{ tabBarLabel: "My Passes" }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanToPayScreen}
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <CenterScanButton
              onPress={props.onPress as (() => void) | undefined}
              accessibilityState={
                props.accessibilityState as { selected?: boolean } | undefined
              }
            />
          ),
        }}
      />
      <Tab.Screen
        name="Shop"
        component={EventListScreen}
        options={{ tabBarLabel: "Shop" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}

export function UserNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UserTabs" component={UserTabs} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
      <Stack.Screen name="BuyTicket" component={BuyTicketScreen} />
      <Stack.Screen name="TicketQR" component={TicketQRScreen} />
      <Stack.Screen name="ScanToPay" component={ScanToPayScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  centerButtonWrapper: {
    top: -22,
    justifyContent: "center",
    alignItems: "center",
    width: CENTER_BUTTON_SIZE + 16,
    height: CENTER_BUTTON_SIZE + 16,
  },
  centerButton: {
    width: CENTER_BUTTON_SIZE,
    height: CENTER_BUTTON_SIZE,
    borderRadius: CENTER_BUTTON_SIZE / 2,
    backgroundColor: ACTIVE_TINT,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: ACTIVE_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  centerButtonFocused: {
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 12,
  },
  centerButtonIcon: {
    fontSize: 28,
    color: "#FFFFFF",
    textAlign: "center",
  },
});
