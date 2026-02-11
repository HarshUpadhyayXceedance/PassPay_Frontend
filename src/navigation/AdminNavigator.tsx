import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { colors } from "../theme/colors";
import { AdminDashboardScreen } from "../screens/admin/AdminDashboardScreen";
import { ManageEventsScreen } from "../screens/admin/ManageEventsScreen";
import { ProfileScreen } from "../screens/common/ProfileScreen";
import { CreateEventScreen } from "../screens/admin/CreateEventScreen";
import { RegisterMerchantScreen } from "../screens/admin/RegisterMerchantScreen";
import { CheckInScannerScreen } from "../screens/admin/CheckInScannerScreen";
import { SettingsScreen } from "../screens/common/SettingsScreen";
import { AboutScreen } from "../screens/common/AboutScreen";
import {
  AdminTabParamList,
  AdminStackParamList,
} from "../types/navigation";

const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createNativeStackNavigator<AdminStackParamList>();

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen
        name="ManageEvents"
        component={ManageEventsScreen}
        options={{ title: "Events" }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
      <Stack.Screen name="RegisterMerchant" component={RegisterMerchantScreen} />
      <Stack.Screen name="CheckInScanner" component={CheckInScannerScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
    </Stack.Navigator>
  );
}
