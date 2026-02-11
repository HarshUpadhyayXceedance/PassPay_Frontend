import { Slot, SplashScreen, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { useAuthStore } from "../src/store/authStore";
import { useWalletStore } from "../src/store/walletStore";
import { AppLoader } from "../src/components/ui/AppLoader";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isAuthenticated, role, isLoading } = useAuthStore();
  const { isConnected } = useWalletStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Quick initialization - no wallet restoration needed
    // User will connect Phantom on WelcomeScreen
    const init = async () => {
      setTimeout(() => {
        setIsInitializing(false);
        SplashScreen.hideAsync();
      }, 100);
    };
    init();
  }, []);

  useEffect(() => {
    if (isInitializing || isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    // If not connected or authenticated, go to welcome screen
    if (!isConnected || !isAuthenticated || !role) {
      if (!inAuthGroup) {
        router.replace("/(auth)/welcome");
      }
      return;
    }

    // If authenticated and still in auth group, redirect to appropriate role screen
    if (isAuthenticated && role && inAuthGroup) {
      if (role === "super_admin") {
        // SuperAdmin can access admin screens
        router.replace("/(admin)");
      } else if (role === "admin") {
        router.replace("/(admin)");
      } else if (role === "merchant") {
        router.replace("/(merchant)");
      } else {
        router.replace("/(user)");
      }
    }
  }, [isConnected, isAuthenticated, role, isInitializing, isLoading, segments]);

  if (isInitializing || isLoading) {
    return <AppLoader fullScreen message="Loading PassPay..." />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Slot />
    </SafeAreaProvider>
  );
}
