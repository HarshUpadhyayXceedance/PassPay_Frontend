import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

const { width, height } = Dimensions.get("window");

interface RoleDetectionLoaderProps {
  visible: boolean;
}

export function RoleDetectionLoader({ visible }: RoleDetectionLoaderProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (visible) {

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();


      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();


      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();


      const dotsInterval = setInterval(() => {
        setDots((prev) => {
          if (prev === "") return ".";
          if (prev === ".") return "..";
          if (prev === "..") return "...";
          return "";
        });
      }, 500);

      return () => {
        clearInterval(dotsInterval);
      };
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

        <View style={styles.backdrop} />


        <View style={styles.content}>

          <Animated.View
            style={[
              styles.loaderContainer,
              {
                transform: [{ rotate: spin }, { scale: pulseAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={[colors.primary, colors.accent, colors.secondary]}
              style={styles.outerRing}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.innerRing}>
                <Text style={styles.solanaSymbol}>◎</Text>
              </View>
            </LinearGradient>
          </Animated.View>


          <View style={styles.textContainer}>
            <Text style={styles.title}>Detecting Role</Text>
            <Text style={styles.subtitle}>Checking blockchain{dots}</Text>
          </View>


          <View style={styles.stepsContainer}>
            <StepItem icon="✓" label="Wallet Connected" active={true} />
            <StepItem icon="◎" label="Querying Blockchain" active={true} />
            <StepItem icon="👤" label="Detecting Role" active={true} />
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

function StepItem({
  icon,
  label,
  active,
}: {
  icon: string;
  label: string;
  active: boolean;
}) {
  const opacity = active ? 1 : 0.3;

  return (
    <View style={[styles.step, { opacity }]}>
      <View style={styles.stepIcon}>
        <Text style={styles.stepIconText}>{icon}</Text>
      </View>
      <Text style={styles.stepLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 14, 26, 0.95)",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loaderContainer: {
    marginBottom: 32,
  },
  outerRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  innerRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  solanaSymbol: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.primary,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
    fontFamily: fonts.displayBold,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    fontFamily: fonts.body,
  },
  stepsContainer: {
    width: "100%",
    gap: 12,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepIconText: {
    fontSize: 18,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
  },
});
