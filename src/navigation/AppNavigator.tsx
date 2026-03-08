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

    const init = async () => {


      setTimeout(() => setIsInitializing(false), 100);
    };
    init();
  }, []);


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


  if (!isConnected || !isAuthenticated || !role) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={WelcomeScreen} />
      </Stack.Navigator>
    );
  }


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
