import { useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { EventDetailsAdminScreen } from "../../src/screens/admin/EventDetailsAdminScreen";
import { useEventStore } from "../../src/store/eventStore";
import { colors } from "../../src/theme/colors";
import { fonts } from "../../src/theme/fonts";

export default function EventDetailsRoute() {
  const { eventKey } = useLocalSearchParams<{ eventKey: string }>();
  const events = useEventStore((s) => s.events);
  const event = events.find((e) => e.publicKey === eventKey);

  if (!event) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Event not found</Text>
      </View>
    );
  }

  return <EventDetailsAdminScreen event={event} />;
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
