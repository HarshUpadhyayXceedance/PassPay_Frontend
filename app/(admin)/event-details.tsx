import { useCallback, useEffect, useRef } from "react";
import { useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { EventDetailsAdminScreen } from "../../src/screens/admin/EventDetailsAdminScreen";
import { useEventStore } from "../../src/store/eventStore";
import { useEvents } from "../../src/hooks/useEvents";
import { useMerchants } from "../../src/hooks/useMerchants";
import { colors } from "../../src/theme/colors";
import { fonts } from "../../src/theme/fonts";

const POLL_INTERVAL = 15_000;

export default function EventDetailsRoute() {
  const { eventKey } = useLocalSearchParams<{ eventKey: string }>();
  const events = useEventStore((s) => s.events);
  const { fetchEvents } = useEvents();
  const { fetchSeatTiers } = useMerchants();
  const event = events.find((e) => e.publicKey === eventKey);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshAll = useCallback(() => {
    fetchEvents();
    if (eventKey) fetchSeatTiers(eventKey);
  }, [eventKey]);

  useFocusEffect(
    useCallback(() => {
      refreshAll();
      intervalRef.current = setInterval(refreshAll, POLL_INTERVAL);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [refreshAll])
  );

  if (!event) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Event not found</Text>
      </View>
    );
  }

  return <EventDetailsAdminScreen event={event} onRefresh={refreshAll} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  text: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: 16,
  },
});
