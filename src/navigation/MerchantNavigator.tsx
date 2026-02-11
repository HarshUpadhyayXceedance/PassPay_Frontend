import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { colors } from "../theme/colors";
import { MerchantDashboardScreen } from "../screens/merchant/MerchantDashboardScreen";
import { GenerateInvoiceQRScreen } from "../screens/merchant/GenerateInvoiceQRScreen";
import { TransactionHistoryScreen } from "../screens/merchant/TransactionHistoryScreen";
import { ProfileScreen } from "../screens/common/ProfileScreen";
import { SettingsScreen } from "../screens/common/SettingsScreen";
import { AboutScreen } from "../screens/common/AboutScreen";
import {
  MerchantTabParamList,
  MerchantStackParamList,
} from "../types/navigation";

const Tab = createBottomTabNavigator<MerchantTabParamList>();
const Stack = createNativeStackNavigator<MerchantStackParamList>();

function MerchantTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="Dashboard" component={MerchantDashboardScreen} />
      <Tab.Screen
        name="GenerateQR"
        component={GenerateInvoiceQRScreen}
        options={{ title: "QR Code" }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionHistoryScreen}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function MerchantNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MerchantTabs" component={MerchantTabs} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
    </Stack.Navigator>
  );
}
