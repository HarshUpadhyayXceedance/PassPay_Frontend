import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";
import { AppHeader } from "../../components/ui/AppHeader";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { apiCreateEvent } from "../../services/api/eventApi";
import {
  validateEventName,
  validateVenue,
  validateTicketPrice,
  validateTotalSeats,
} from "../../utils/validators";
import { AdminStackParamList } from "../../types/navigation";

type Nav = NativeStackNavigationProp<AdminStackParamList, "CreateEvent">;

export function CreateEventScreen() {
  const navigation = useNavigation<Nav>();
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [totalSeats, setTotalSeats] = useState("");
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const validate = (): boolean => {
    const newErrors = {
      name: validateEventName(name),
      venue: validateVenue(venue),
      ticketPrice: validateTicketPrice(ticketPrice),
      totalSeats: validateTotalSeats(totalSeats),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleCreate = async () => {
    if (!validate()) return;

    setCreating(true);
    try {
      // Event date set to 7 days from now as default
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + 7);

      const tx = await apiCreateEvent({
        name,
        venue,
        eventDate,
        ticketPrice: parseFloat(ticketPrice),
        totalSeats: parseInt(totalSeats, 10),
        metadataUri: `https://arweave.net/placeholder-${Date.now()}`,
      });

      Alert.alert("Success", "Event created successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Failed to create event");
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Create Event" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AppInput
          label="Event Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Solana Hackathon 2025"
          error={errors.name ?? undefined}
          maxLength={64}
        />

        <AppInput
          label="Venue"
          value={venue}
          onChangeText={setVenue}
          placeholder="e.g. San Francisco, CA"
          error={errors.venue ?? undefined}
          maxLength={128}
        />

        <AppInput
          label="Ticket Price (SOL)"
          value={ticketPrice}
          onChangeText={setTicketPrice}
          placeholder="0.1"
          keyboardType="decimal-pad"
          error={errors.ticketPrice ?? undefined}
        />

        <AppInput
          label="Total Seats"
          value={totalSeats}
          onChangeText={setTotalSeats}
          placeholder="100"
          keyboardType="number-pad"
          error={errors.totalSeats ?? undefined}
        />

        <AppButton
          title="Create Event"
          onPress={handleCreate}
          loading={creating}
          size="lg"
          style={styles.createButton}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  createButton: {
    marginTop: spacing.lg,
  },
});
