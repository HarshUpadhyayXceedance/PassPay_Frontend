import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ConfettiProps {
  count?: number;
  duration?: number;
  colors?: string[];
  onComplete?: () => void;
}

export function Confetti({
  count = 50,
  duration = 3000,
  colors = ["#6C5CE7", "#00CEC9", "#FFD700", "#FF6B6B", "#4ECDC4"],
  onComplete,
}: ConfettiProps) {
  const confettiPieces = useRef(
    Array.from({ length: count }).map(() => ({
      x: new Animated.Value(Math.random() * SCREEN_WIDTH),
      y: new Animated.Value(-50),
      rotate: new Animated.Value(0),
      color: colors[Math.floor(Math.random() * colors.length)],
    }))
  ).current;

  useEffect(() => {
    const animations = confettiPieces.map((piece) =>
      Animated.parallel([
        Animated.timing(piece.y, {
          toValue: SCREEN_HEIGHT + 100,
          duration: duration + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(piece.x, {
          toValue: Math.random() * SCREEN_WIDTH,
          duration: duration + Math.random() * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(piece.rotate, {
          toValue: Math.random() * 10,
          duration: duration,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.stagger(10, animations).start(() => {
      onComplete?.();
    });
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {confettiPieces.map((piece, index) => (
        <Animated.View
          key={index}
          style={[
            styles.confetti,
            {
              backgroundColor: piece.color,
              transform: [
                { translateX: piece.x },
                { translateY: piece.y },
                {
                  rotate: piece.rotate.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  confetti: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
