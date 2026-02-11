import React, { useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { EventCard } from "../../components/event/EventCard";
import { AppLoader } from "../../components/ui/AppLoader";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { useEvents } from "../../hooks/useEvents";
import { UserStackParamList } from "../../types/navigation";
import { EventDisplay } from "../../types/event";

type Nav = NativeStackNavigationProp<UserStackParamList>;

export function EventListScreen() {
  const navigation = useNavigation<Nav>();
  const { events, fetchEvents, isLoading } = useEvents();

  useEffect(() => {
    fetchEvents();
  }, []);

  const renderEvent = ({ item }: { item: EventDisplay }) => (
    <EventCard
      event={item}
      onPress={() =>
        navigation.navigate("EventDetails", { eventKey: item.publicKey })
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
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xxl,
  },
});
