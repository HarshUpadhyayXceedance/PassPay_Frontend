import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { PublicKey } from "@solana/web3.js";
import { AppInput } from "../../components/ui/AppInput";
import { AppButton } from "../../components/ui/AppButton";
import { AppCard } from "../../components/ui/AppCard";
import { ImagePickerButton } from "../../components/ui/ImagePickerButton";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";
import { useWallet } from "../../hooks/useWallet";
import { updateEvent } from "../../solana/actions/updateEvent";
import { uploadImageToCloudinary } from "../../services/cloudinary/uploadImage";
import { solToLamports } from "../../utils/formatters";
import { EventDisplay } from "../../types/event";

interface UpdateEventScreenProps {
  event: EventDisplay;
}

export function UpdateEventScreen({ event }: UpdateEventScreenProps) {
  const router = useRouter();
  const { publicKey } = useWallet();

  const [venue, setVenue] = useState(event.venue);
  const [description, setDescription] = useState(event.description ?? "");
  const [imageUri, setImageUri] = useState(event.imageUrl ?? "");
  const [imageChanged, setImageChanged] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ticketPrice, setTicketPrice] = useState(event.ticketPrice.toString());
  const [totalSeats, setTotalSeats] = useState(event.totalSeats.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdate = async () => {
    if (!publicKey) {
      Alert.alert("Error", "Wallet not connected");
      return;
    }

    setIsSubmitting(true);
    try {
      const adminPubkey = new PublicKey(publicKey);
      const eventPubkey = new PublicKey(event.publicKey);

      const params: any = {};
      if (venue !== event.venue) params.venue = venue;
      if (description !== (event.description ?? "")) params.description = description;
      if (imageChanged && imageUri) {
        setUploading(true);
        try {
          params.imageUrl = await uploadImageToCloudinary(imageUri);
        } finally {
          setUploading(false);
        }
      }
      if (parseFloat(ticketPrice) !== event.ticketPrice) {
        params.ticketPrice = solToLamports(parseFloat(ticketPrice));
      }
      if (parseInt(totalSeats) !== event.totalSeats) {
        params.totalSeats = parseInt(totalSeats);
      }

      if (Object.keys(params).length === 0) {
        Alert.alert("No Changes", "No fields were modified.");
        return;
      }

      const signature = await updateEvent(adminPubkey, eventPubkey, params);

      Alert.alert("Success", `Event updated!\n\nSignature: ${signature.slice(0, 8)}...`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update event");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Update Event</Text>
        <Text style={styles.subtitle}>{event.name}</Text>

        <AppCard style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Venue</Text>
            <AppInput
              placeholder="Event venue"
              value={venue}
              onChangeText={setVenue}
              maxLength={128}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <AppInput
              placeholder="Event description"
              value={description}
              onChangeText={setDescription}
              maxLength={256}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event Image</Text>
            <ImagePickerButton
              imageUri={imageUri || undefined}
              onImageSelected={(uri) => {
                setImageUri(uri);
                setImageChanged(true);
              }}
              uploading={uploading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ticket Price (SOL)</Text>
            <AppInput
              placeholder="0.5"
              value={ticketPrice}
              onChangeText={setTicketPrice}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Total Seats</Text>
            <AppInput
              placeholder="100"
              value={totalSeats}
              onChangeText={setTotalSeats}
              keyboardType="number-pad"
            />
          </View>
        </AppCard>

        <View style={styles.actions}>
          <AppButton
            title="Cancel"
            variant="outline"
            onPress={() => router.back()}
            style={styles.cancelBtn}
          />
          <AppButton
            title={isSubmitting ? "Updating..." : "Save Changes"}
            onPress={handleUpdate}
            loading={isSubmitting}
            style={styles.submitBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.heading,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  card: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  cancelBtn: {
    flex: 1,
  },
  submitBtn: {
    flex: 2,
  },
});
