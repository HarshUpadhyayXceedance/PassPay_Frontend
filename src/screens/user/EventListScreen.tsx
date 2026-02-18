import React, { useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { EventCard } from "../../components/event/EventCard";
import { AppLoader } from "../../components/ui/AppLoader";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";
import { useEvents } from "../../hooks/useEvents";
import { EventDisplay } from "../../types/event";

export function EventListScreen() {
  const router = useRouter();
  const { events, fetchEvents, isLoading } = useEvents();

  useEffect(() => {
    fetchEvents();
  }, []);

  const renderEvent = ({ item }: { item: EventDisplay }) => (
    <EventCard
      event={item}
      onPress={() =>
        router.push({ pathname: "/(user)/event-details", params: { eventKey: item.publicKey } })
      }
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.publicKey}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchEvents}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <AppLoader />
          ) : (
            <Text style={styles.emptyText}>No events found</Text>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xxl,
  },
});
