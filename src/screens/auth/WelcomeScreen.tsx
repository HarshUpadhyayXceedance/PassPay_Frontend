import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/colors";
import { useWalletStore } from "../../store/walletStore";
import { useAuthStore } from "../../store/authStore";

const { width, height } = Dimensions.get("window");

export function WelcomeScreen() {
  const [isConnecting, setIsConnecting] = useState(false);

  const { connectPhantom } = useWalletStore();
  const { detectRole } = useAuthStore();

  const handleConnectPhantom = async () => {
    setIsConnecting(true);
    try {
      // Connect to Phantom wallet
      await connectPhantom();

      // Get the connected wallet's public key
      const publicKey = useWalletStore.getState().publicKey;

      if (!publicKey) {
        throw new Error("Failed to get wallet public key");
      }

      // Detect user role on-chain
      await detectRole(publicKey);

      console.log("✅ Connection and role detection complete!");
      // Navigation will be handled by AppNavigator based on role
    } catch (error: any) {
      console.error("❌ Connection failed:", error);

      // Check if user needs to install Phantom
      if (
        error.message?.includes("No wallet") ||
        error.message?.includes("not installed")
      ) {
        Alert.alert(
          "Phantom Wallet Required",
          "You need to install Phantom wallet to use PassPay. Would you like to download it?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Download",
              onPress: () => Linking.openURL("https://phantom.app/download"),
            },
          ]
        );
      } else {
        Alert.alert(
          "Connection Failed",
          error.message || "Failed to connect to Phantom wallet. Please try again."
        );
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.secondary, colors.accent, "transparent"]}
        style={styles.glowTop}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      <View style={styles.content}>
        <View style={styles.logoArea}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>🎫</Text>
          </View>
          <Text style={styles.logoText}>PassPay</Text>
          <Text style={styles.tagline}>
            NFT Tickets & Loyalty Rewards{"\n"}Powered by Solana
          </Text>
        </View>

        <View style={styles.features}>
          <FeatureItem
            icon="🎫"
            title="NFT Tickets"
            desc="Collectible tickets with loyalty badges"
          />
          <FeatureItem
            icon="🏆"
            title="Loyalty Rewards"
            desc="Earn tier-based discounts and perks"
          />
          <FeatureItem
            icon="📊"
            title="Dynamic Pricing"
            desc="Smart pricing based on demand"
          />
          <FeatureItem
            icon="📱"
            title="Scan2Pay"
            desc="Pay merchants at events with a QR scan"
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleConnectPhantom}
            activeOpacity={0.8}
            disabled={isConnecting}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isConnecting ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Connect Phantom Wallet</Text>
                  <Text style={styles.buttonArrow}>→</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL("https://phantom.app")}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>What is Phantom? →</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>Secured by Solana Blockchain</Text>
        </View>
      </View>
    </View>
  );
}

function FeatureItem({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <View style={fStyles.container}>
      <View style={fStyles.iconBox}>
        <Text style={fStyles.icon}>{icon}</Text>
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
    marginBottom: 12,
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  icon: { fontSize: 20 },
  textBox: { flex: 1 },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  desc: { color: colors.textSecondary, fontSize: 12, lineHeight: 16 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  glowTop: {
    position: "absolute",
    top: -100,
    left: -50,
    width: width + 100,
    height: 300,
    opacity: 0.15,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: height * 0.08,
    paddingBottom: 40,
  },
  logoArea: { alignItems: "center" },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoEmoji: { fontSize: 32 },
  logoText: {
    fontSize: 42,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  features: { marginTop: 10 },
  actions: { alignItems: "center" },
  primaryButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    minHeight: 56,
  },
  buttonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: "700",
    marginRight: 8,
  },
  buttonArrow: { color: colors.background, fontSize: 20, fontWeight: "700" },
  linkButton: {
    paddingVertical: 10,
    marginBottom: 8,
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  footerText: { color: colors.textMuted, fontSize: 13 },
});
