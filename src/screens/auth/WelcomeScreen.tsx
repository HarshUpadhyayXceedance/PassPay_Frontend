import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Animated,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { useWalletStore } from "../../store/walletStore";
import { useAuthStore } from "../../store/authStore";
import { SuccessAnimation } from "../../components/animations/SuccessAnimation";
import { RoleDetectionLoader } from "../../components/ui/RoleDetectionLoader";
import { showError } from "../../utils/alerts";
import { confirm } from "../../components/ui/ConfirmDialogProvider";

const { width, height } = Dimensions.get("window");

export function WelcomeScreen() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { connectPhantom } = useWalletStore();
  const { detectRole, isDetectingRole } = useAuthStore();


  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(slideUp, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();


    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  const handleConnectPhantom = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setIsConnecting(true);
    try {

      await connectPhantom();


      const publicKey = useWalletStore.getState().publicKey;

      if (!publicKey) {
        throw new Error("Failed to get wallet public key");
      }


      setShowSuccess(true);


      await new Promise((resolve) => setTimeout(resolve, 800));


      await detectRole(publicKey);

      console.log("Connection and role detection complete!");

    } catch (error: any) {
      console.error("Connection failed:", error);


      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);


      if (
        error.message?.includes("No wallet") ||
        error.message?.includes("not installed")
      ) {
        confirm({
          title: "Phantom Wallet Required",
          message: "You need to install Phantom wallet to use PassPay. Would you like to download it?",
          type: "info",
          buttons: [
            { text: "Cancel", style: "cancel", onPress: () => {} },
            { text: "Download", style: "default", onPress: () => Linking.openURL("https://phantom.app/download") },
          ],
        });
      } else {
        showError("Connection Failed", error.message || "Failed to connect to Phantom wallet. Please try again.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <View style={styles.container}>

      <LinearGradient
        colors={["#6C5CE7", "#00CEC9", "transparent"]}
        style={styles.glowTop}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />
      <LinearGradient
        colors={["transparent", "#0A0E1A", "#6C5CE7"]}
        style={styles.glowBottom}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.logoArea,
            {
              transform: [{ translateY: slideUp }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoIconContainer,
              {
                transform: [{ scale: Animated.multiply(logoScale, logoPulse) }],
              },
            ]}
          >
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              style={styles.logoIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Image
                source={require("../../../assets/icon.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </LinearGradient>
          </Animated.View>
          <Text style={styles.logoText}>PassPay</Text>
          <View style={styles.taglineContainer}>
            <Text style={styles.tagline}>Your Web3 Event Pass</Text>
            <View style={styles.taglineDot} />
          </View>
          <Text style={styles.subtitle}>
            NFT Tickets • Loyalty Rewards • Instant Payments
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.features,
            {
              transform: [{ translateY: slideUp }],
            },
          ]}
        >
          <FeatureItem icon="ticket-outline" title="NFT Tickets" desc="Collectible event passes" />
          <FeatureItem icon="trophy-outline" title="Loyalty Rewards" desc="Tier-based benefits" />
          <FeatureItem icon="flash-outline" title="Instant Payments" desc="Scan QR to pay merchants" />
        </Animated.View>

        <Animated.View
          style={[
            styles.actions,
            {
              transform: [{ scale: buttonScale }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleConnectPhantom}
            activeOpacity={0.85}
            disabled={isConnecting}
          >
            <LinearGradient
              colors={isConnecting ? [colors.surfaceLight, colors.surface] : [colors.primary, colors.accent]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isConnecting ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.text} size="small" />
                  <Text style={styles.loadingText}>Connecting...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <View style={styles.phantomLogo}>
                    <Ionicons name="wallet-outline" size={20} color={colors.background} />
                  </View>
                  <Text style={styles.buttonText}>Connect Phantom Wallet</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL("https://phantom.app")}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>Don't have Phantom? Get it here →</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <View style={styles.solanaLogo}>
              <Text style={styles.solanaText}>◎</Text>
            </View>
            <Text style={styles.footerText}>Powered by Solana</Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* Success animation */}
      <SuccessAnimation
        visible={showSuccess}
        title="Wallet Connected!"
        message="Detecting your role on-chain..."
        onComplete={() => setShowSuccess(false)}
        duration={2000}
      />

      {/* Role detection loader */}
      <RoleDetectionLoader visible={isDetectingRole} />
    </View>
  );
}

function FeatureItem({
  icon,
  title,
  desc,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}) {
  return (
    <View style={fStyles.container}>
      <View style={fStyles.iconBox}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <View style={fStyles.textBox}>
        <Text style={fStyles.title}>{title}</Text>
        <Text style={fStyles.desc}>{desc}</Text>
      </View>
    </View>
  );
}

const fStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  textBox: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    fontFamily: fonts.bodySemiBold,
  },
  desc: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.body,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  glowTop: {
    position: "absolute",
    top: -100,
    left: -50,
    width: width + 100,
    height: 350,
    opacity: 0.12,
  },
  glowBottom: {
    position: "absolute",
    bottom: -100,
    left: 0,
    right: 0,
    height: 300,
    opacity: 0.08,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: height * 0.12,
    paddingBottom: 50,
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoIconContainer: {
    marginBottom: 24,
  },
  logoIcon: {
    width: 100,
    height: 100,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 22,
  },
  logoText: {
    fontSize: 48,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 12,
    fontFamily: fonts.displayBold,
    letterSpacing: -1.5,
  },
  taglineContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: colors.primary,
    textAlign: "center",
    fontFamily: fonts.headingSemiBold,
    letterSpacing: 0.5,
  },
  taglineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginLeft: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    fontFamily: fonts.body,
  },
  features: {
    marginTop: 20,
    gap: 12,
  },
  actions: {
    alignItems: "center",
    width: "100%",
  },
  primaryButton: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    minHeight: 62,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: fonts.bodySemiBold,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  phantomLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: colors.background,
    fontSize: 17,
    fontWeight: "700",
    fontFamily: fonts.bodySemiBold,
  },
  linkButton: {
    paddingVertical: 12,
    marginBottom: 16,
  },
  linkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: fonts.body,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  solanaLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
  },
  solanaText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fonts.body,
  },
});
