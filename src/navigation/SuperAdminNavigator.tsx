import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { colors } from "../theme/colors";
import { SuperAdminDashboardScreen } from "../screens/superadmin/SuperAdminDashboardScreen";
import { AdminListScreen } from "../screens/superadmin/AdminListScreen";
import { ManageEventsScreen } from "../screens/admin/ManageEventsScreen";
import { ProfileScreen } from "../screens/common/ProfileScreen";
import { CreateEventScreen } from "../screens/admin/CreateEventScreen";
import { RegisterMerchantScreen } from "../screens/admin/RegisterMerchantScreen";
import { CheckInScannerScreen } from "../screens/admin/CheckInScannerScreen";
import { SettingsScreen } from "../screens/common/SettingsScreen";
import { AboutScreen } from "../screens/common/AboutScreen";
import {
  SuperAdminTabParamList,
  SuperAdminStackParamList,
} from "../types/navigation";

const Tab = createBottomTabNavigator<SuperAdminTabParamList>();
const Stack = createNativeStackNavigator<SuperAdminStackParamList>();

function SuperAdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.secondary, // Purple for SuperAdmin
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="System"
        component={SuperAdminDashboardScreen}
        options={{
          title: "System",
          tabBarIcon: ({ color, size }) => <Ionicons name="flash-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Admins"
        component={AdminListScreen}
        options={{
          title: "Admins",
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Events"
        component={ManageEventsScreen}
        options={{
          title: "Events",
          tabBarIcon: ({ color, size }) => <Ionicons name="ticket-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function SuperAdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SuperAdminTabs" component={SuperAdminTabs} />
      {/* SuperAdmin-specific screens */}
      <Stack.Screen
        name="CreateAdmin"
        component={CreateEventScreen} // Placeholder for Phase 1
        options={{ title: "Create Admin" }}
      />
      <Stack.Screen
        name="InitializeBadgeCollection"
        component={CreateEventScreen} // Placeholder for Phase 1
        options={{ title: "Initialize Badges" }}
      />
      {/* Shared admin screens */}
      <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
      <Stack.Screen name="RegisterMerchant" component={RegisterMerchantScreen} />
      <Stack.Screen name="CheckInScanner" component={CheckInScannerScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
    </Stack.Navigator>
  );
}
