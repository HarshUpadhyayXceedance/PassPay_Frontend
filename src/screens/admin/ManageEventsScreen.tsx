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
import { AppButton } from "../../components/ui/AppButton";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { useEvents } from "../../hooks/useEvents";
import { useWalletStore } from "../../store/walletStore";
import { EventDisplay } from "../../types/event";
import { AdminStackParamList } from "../../types/navigation";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function ManageEventsScreen() {
  const navigation = useNavigation<Nav>();
  const { events, fetchEvents, isLoading } = useEvents();
  const publicKey = useWalletStore((s) => s.publicKey);

  useEffect(() => {
    fetchEvents();
  }, []);

  const myEvents = events.filter((e) => e.admin === publicKey);

  const renderEvent = ({ item }: { item: EventDisplay }) => (
    <EventCard
      event={item}
      onPress={() =>
        navigation.navigate("CheckInScanner", {
          eventKey: item.publicKey,
        })
      }
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={myEvents}
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
        ListHeaderComponent={
          <AppButton
            title="+ Create Event"
            onPress={() => navigation.navigate("CreateEvent")}
            variant="outline"
            style={styles.createButton}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <AppLoader />
          ) : (
            <Text style={styles.emptyText}>
              No events yet. Create your first event!
            </Text>
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
  createButton: {
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xxl,
  },
});
