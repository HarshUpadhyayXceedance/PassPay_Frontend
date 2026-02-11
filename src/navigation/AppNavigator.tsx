import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { WelcomeScreen } from "../screens/auth/WelcomeScreen";
import { UserNavigator } from "./UserNavigator";
import { AdminNavigator } from "./AdminNavigator";
import { MerchantNavigator } from "./MerchantNavigator";
import { SuperAdminNavigator } from "./SuperAdminNavigator";
import { useAuthStore } from "../store/authStore";
import { useWalletStore } from "../store/walletStore";
import { colors } from "../theme/colors";
import { RootStackParamList } from "../types/navigation";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { isAuthenticated, role, isLoading } = useAuthStore();
  const { isConnected } = useWalletStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Quick initialization - just mark as ready
    const init = async () => {
      // In the new flow, there's no wallet restoration
      // User will connect Phantom on WelcomeScreen
      setTimeout(() => setIsInitializing(false), 100);
    };
    init();
  }, []);

  // Show loading spinner during initialization or role detection
  if (isInitializing || isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // If not connected or not authenticated, show WelcomeScreen
  if (!isConnected || !isAuthenticated || !role) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={WelcomeScreen} />
      </Stack.Navigator>
    );
  }

  // Role-based routing
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {role === "super_admin" ? (
        <Stack.Screen name="SuperAdmin" component={SuperAdminNavigator} />
      ) : role === "admin" ? (
        <Stack.Screen name="Admin" component={AdminNavigator} />
      ) : role === "merchant" ? (
        <Stack.Screen name="Merchant" component={MerchantNavigator} />
      ) : (
        <Stack.Screen name="User" component={UserNavigator} />
      )}
    </Stack.Navigator>
  );
}
