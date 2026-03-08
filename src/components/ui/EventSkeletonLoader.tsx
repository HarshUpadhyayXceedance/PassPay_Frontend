import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";
import { colors } from "../../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FEATURED_CARD_WIDTH = SCREEN_WIDTH * 0.72;
const FEATURED_CARD_HEIGHT = 220;

export function FeaturedEventSkeleton() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.featuredCardWrapper}>
      <Animated.View style={[styles.featuredCard, { opacity }]}>
        <View style={styles.badge} />
        <View style={styles.contentBottom}>
          <View style={styles.titleBar} />
          <View style={styles.subtitleBar} />
          <View style={styles.priceBar} />
        </View>
      </Animated.View>
    </View>
  );
}

export function UpcomingEventSkeleton() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View style={[styles.upcomingCard, { opacity }]}>
      <View style={styles.thumbnail} />
      <View style={styles.info}>
        <View style={styles.titleBarSmall} />
        <View style={styles.subtitleBarSmall} />
        <View style={styles.dateBar} />
      </View>
      <View style={styles.rightSection}>
        <View style={styles.priceBarSmall} />
        <View style={styles.button} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({

  featuredCardWrapper: {
    marginRight: 16,
  },
  featuredCard: {
    width: FEATURED_CARD_WIDTH,
    height: FEATURED_CARD_HEIGHT,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    justifyContent: "space-between",
    padding: 16,
  },
  badge: {
    width: 100,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
  },
  contentBottom: {
    gap: 8,
  },
  titleBar: {
    width: "80%",
    height: 20,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
  },
  subtitleBar: {
    width: "50%",
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
  },
  priceBar: {
    width: 80,
    height: 24,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
  },


  upcomingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
  },
  info: {
    flex: 1,
    marginLeft: 14,
    gap: 6,
  },
  titleBarSmall: {
    width: "70%",
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
  },
  subtitleBarSmall: {
    width: "50%",
    height: 12,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
  },
  dateBar: {
    width: "40%",
    height: 10,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
  },
  rightSection: {
    alignItems: "flex-end",
    gap: 8,
  },
  priceBarSmall: {
    width: 60,
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
  },
  button: {
    width: 60,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
  },
});
