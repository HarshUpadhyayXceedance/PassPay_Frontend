import { Redirect, Slot, SplashScreen, useSegments, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../src/store/authStore";
import { useWalletStore } from "../src/store/walletStore";
import { SplashScreenView } from "../src/components/ui/SplashScreenView";
import { OnboardingCarousel } from "../src/components/ui/OnboardingCarousel";
import { fontAssets } from "../src/theme/fonts";
import { ErrorBoundary } from "../src/components/ui/ErrorBoundary";
import { OfflineBanner } from "../src/components/ui/OfflineBanner";
import { registerForPushNotifications } from "../src/services/notifications/pushNotifications";

SplashScreen.preventAutoHideAsync();

const ONBOARDING_COMPLETED_KEY = "onboarding_completed";

export default function RootLayout() {
  const { isAuthenticated, role, isLoading, loadStoredRole } = useAuthStore();
  const { isConnected } = useWalletStore();
  const [isInitializing, setIsInitializing] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const pendingDeepLink = useRef<string | null>(null);

  const [fontsLoaded] = useFonts(fontAssets);

  // Handle deep links: store pending URL if not authenticated
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      const parsed = Linking.parse(event.url);
      if (parsed.path === "accept-transfer" && parsed.queryParams) {
        const { ticketMint, eventKey, from } = parsed.queryParams;
        if (ticketMint && eventKey && from) {
          if (isAuthenticated && isConnected && role) {
            router.push({
              pathname: "/(user)/accept-transfer",
              params: { ticketMint: String(ticketMint), eventKey: String(eventKey), from: String(from) },
            });
          } else {
            pendingDeepLink.current = event.url;
          }
        }
      }
    };

    // Check initial URL (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    // Listen for URLs while app is open
    const sub = Linking.addEventListener("url", handleUrl);
    return () => sub.remove();
  }, [isAuthenticated, isConnected, role]);

  // Process pending deep link after authentication
  useEffect(() => {
    if (isAuthenticated && isConnected && role && pendingDeepLink.current) {
      const parsed = Linking.parse(pendingDeepLink.current);
      pendingDeepLink.current = null;
      if (parsed.path === "accept-transfer" && parsed.queryParams) {
        const { ticketMint, eventKey, from } = parsed.queryParams;
        if (ticketMint && eventKey && from) {
          setTimeout(() => {
            router.push({
              pathname: "/(user)/accept-transfer",
              params: { ticketMint: String(ticketMint), eventKey: String(eventKey), from: String(from) },
            });
          }, 500);
        }
      }
    }
  }, [isAuthenticated, isConnected, role]);

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

          // Register for push notifications (non-blocking)
          registerForPushNotifications().catch(() => {});
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
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <OfflineBanner />
        <Slot />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
