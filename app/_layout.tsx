import { Redirect, Slot, SplashScreen, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../src/store/authStore";
import { useWalletStore } from "../src/store/walletStore";
import { SplashScreenView } from "../src/components/ui/SplashScreenView";
import { OnboardingCarousel } from "../src/components/ui/OnboardingCarousel";
import { fontAssets } from "../src/theme/fonts";

SplashScreen.preventAutoHideAsync();

const ONBOARDING_COMPLETED_KEY = "onboarding_completed";

export default function RootLayout() {
  const { isAuthenticated, role, isLoading, loadStoredRole } = useAuthStore();
  const { isConnected } = useWalletStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const segments = useSegments();

  const [fontsLoaded] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();

      // Check onboarding status and load stored role
      const initialize = async () => {
        try {
          // Load stored role from SecureStore
          await loadStoredRole();

          // Check if user has completed onboarding
          const onboardingCompleted = await AsyncStorage.getItem(
            ONBOARDING_COMPLETED_KEY
          );

          if (!onboardingCompleted) {
            setShowOnboarding(true);
          }

          setOnboardingChecked(true);
        } catch (error) {
          console.error("Failed to initialize app:", error);
          setOnboardingChecked(true);
        }
      };

      const timer = setTimeout(() => {
        initialize();
        setIsInitializing(false);
      }, 2400);

      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
      setShowOnboarding(false);
    } catch (error) {
      console.error("Failed to save onboarding status:", error);
      setShowOnboarding(false);
    }
  };

  // Show splash while loading
  if (!fontsLoaded || isInitializing || isLoading || !onboardingChecked) {
    return <SplashScreenView />;
  }

  // Show onboarding for first-time users
  if (showOnboarding) {
    return <OnboardingCarousel visible={true} onComplete={handleOnboardingComplete} />;
  }

  const inAuthGroup = segments[0] === "(auth)";

  // Not authenticated → redirect to welcome (declarative, no isReady needed)
  if (!isConnected || !isAuthenticated || !role) {
    if (!inAuthGroup) {
      return <Redirect href="/(auth)/welcome" />;
    }
  }

  // Authenticated but still on auth screens → redirect to role-based home
  if (isAuthenticated && role && inAuthGroup) {
    if (role === "super_admin" || role === "admin") {
      return <Redirect href="/(admin)" />;
    }
    if (role === "merchant") {
      return <Redirect href="/(merchant)" />;
    }
    return <Redirect href="/(user)" />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Slot />
    </SafeAreaProvider>
  );
}
