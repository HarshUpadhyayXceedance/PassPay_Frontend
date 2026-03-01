import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

const { width, height } = Dimensions.get("window");

interface OnboardingSlide {
  id: string;
  emoji: string;
  title: string;
  description: string;
  gradient: [string, string];
}

const SLIDES: OnboardingSlide[] = [
  {
    id: "1",
    emoji: "🎫",
    title: "NFT Event Tickets",
    description:
      "Purchase event tickets as unique NFTs. Collectible, transferable, and securely stored on the Solana blockchain.",
    gradient: ["#6C5CE7", "#A29BFE"],
  },
  {
    id: "2",
    emoji: "🏆",
    title: "Loyalty Rewards",
    description:
      "Attend events to earn loyalty tiers. Unlock discounts, early access, VIP perks, and exclusive badges.",
    gradient: ["#00CEC9", "#00B894"],
  },
  {
    id: "3",
    emoji: "⚡",
    title: "Instant Payments",
    description:
      "Scan QR codes to pay merchants at events. Fast, secure payments powered by Solana with automatic loyalty discounts.",
    gradient: ["#FD79A8", "#E17055"],
  },
];

interface OnboardingCarouselProps {
  visible: boolean;
  onComplete: () => void;
}

export function OnboardingCarousel({
  visible,
  onComplete,
}: OnboardingCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const isLastSlide = currentIndex === SLIDES.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleMomentumScrollEnd = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  if (!visible) return null;

  return (
    <Modal animationType="fade" transparent={false} visible={visible}>
      <View style={styles.container}>
        {/* Skip button */}
        {!isLastSlide && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SlideItem
              emoji={item.emoji}
              title={item.title}
              description={item.description}
              gradient={item.gradient}
            />
          )}
        />

        {/* Dots indicator */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => {
            const inputRange = [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: "clamp",
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: "clamp",
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Next/Get Started button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            style={styles.nextButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.nextButtonText}>
              {isLastSlide ? "Get Started" : "Next"}
            </Text>
            {!isLastSlide && <Text style={styles.arrow}>→</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function SlideItem({
  emoji,
  title,
  description,
  gradient,
}: {
  emoji: string;
  title: string;
  description: string;
  gradient: [string, string];
}) {
  return (
    <View style={styles.slide}>
      {/* Background gradient */}
      <LinearGradient
        colors={[...gradient, "transparent"]}
        style={styles.slideGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />

      {/* Content */}
      <View style={styles.slideContent}>
        {/* Emoji icon */}
        <View style={styles.emojiContainer}>
          <LinearGradient
            colors={gradient}
            style={styles.emojiBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </LinearGradient>
        </View>

        {/* Text */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipButton: {
    position: "absolute",
    top: 60,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: 20,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    fontFamily: fonts.bodySemiBold,
  },
  slide: {
    width,
    height,
    alignItems: "center",
    justifyContent: "center",
  },
  slideGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
    opacity: 0.15,
  },
  slideContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 180,
  },
  emojiContainer: {
    marginBottom: 40,
  },
  emojiBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  emoji: {
    fontSize: 64,
  },
  textContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 16,
    textAlign: "center",
    fontFamily: fonts.displayBold,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 26,
    fontFamily: fonts.body,
    paddingHorizontal: 8,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    bottom: 140,
    left: 0,
    right: 0,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  nextButton: {
    position: "absolute",
    bottom: 50,
    left: 24,
    right: 24,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  nextButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.background,
    fontFamily: fonts.bodySemiBold,
  },
  arrow: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.background,
  },
});
