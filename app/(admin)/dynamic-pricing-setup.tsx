import { useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { View, StyleSheet } from "react-native";
import { AppHeader } from "../../src/components/ui/AppHeader";
import { DynamicPricingSetupModal } from "../../src/screens/admin/DynamicPricingSetupModal";
import { useMerchants } from "../../src/hooks/useMerchants";
import { colors } from "../../src/theme/colors";

export default function DynamicPricingSetupRoute() {
  const router = useRouter();
  const { eventKey, basePrice } = useLocalSearchParams<{
    eventKey: string;
    basePrice: string;
  }>();
  const { seatTiers, fetchSeatTiers } = useMerchants();

  useEffect(() => {
    if (eventKey) fetchSeatTiers(eventKey);
  }, [eventKey]);

  const eventTiers = seatTiers.filter((t) => t.eventKey === eventKey);
  const basePriceNum = parseFloat(basePrice ?? "0");

  return (
    <View style={styles.container}>
      <AppHeader title="Dynamic Pricing" onBack={() => router.back()} />
      <DynamicPricingSetupModal
        eventPubkey={eventKey ?? ""}
        basePrice={basePriceNum}
        tiers={eventTiers}
        onSuccess={() => router.back()}
        onCancel={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
