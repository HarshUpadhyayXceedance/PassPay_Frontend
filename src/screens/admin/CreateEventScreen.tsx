import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";
import { AppHeader } from "../../components/ui/AppHeader";
import { ImagePickerButton } from "../../components/ui/ImagePickerButton";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { apiCreateEvent } from "../../services/api/eventApi";
import { uploadImageToCloudinary } from "../../services/cloudinary/uploadImage";
import {
  validateEventName,
  validateVenue,
  validateEventDescription,
  validateTicketPrice,
  validateTotalSeats,
} from "../../utils/validators";
export function CreateEventScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [description, setDescription] = useState("");
  const [ticketPrice, setTicketPrice] = useState("");
  const [totalSeats, setTotalSeats] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const validate = (): boolean => {
    const newErrors = {
      name: validateEventName(name),
      venue: validateVenue(venue),
      description: validateEventDescription(description),
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
      // Upload image to Cloudinary if selected
      let imageUrl = "";
      if (imageUri) {
        setUploading(true);
        try {
          imageUrl = await uploadImageToCloudinary(imageUri);
        } finally {
          setUploading(false);
        }
      }

      // Event date set to 7 days from now as default
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + 7);

      const tx = await apiCreateEvent({
        name,
        venue,
        description,
        imageUrl,
        eventDate,
        ticketPrice: parseFloat(ticketPrice),
        totalSeats: parseInt(totalSeats, 10),
        metadataUri: `https://arweave.net/placeholder-${Date.now()}`,
      });

      Alert.alert("Success", "Event created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const msg = error.message ?? "Failed to create event";
      if (msg.includes("Cancelled") || msg.includes("CancellationException")) {
        Alert.alert("Cancelled", "Transaction was cancelled.");
      } else if (msg.includes("already in use")) {
        Alert.alert(
          "Event Already Exists",
          `An event named "${name}" already exists for your admin account. Please use a different name.`
        );
      } else if (msg.includes("AccountNotInitialized")) {
        Alert.alert(
          "Admin Not Initialized",
          "Your admin account needs to be initialized first. Please contact a super admin."
        );
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Create Event" onBack={() => router.back()} />

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
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your event..."
          error={errors.description ?? undefined}
          maxLength={256}
          multiline
          numberOfLines={3}
        />

        <ImagePickerButton
          label="Event Image"
          imageUri={imageUri || undefined}
          onImageSelected={setImageUri}
          uploading={uploading}
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
