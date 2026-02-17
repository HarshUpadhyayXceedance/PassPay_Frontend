import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";
import { AppHeader } from "../../components/ui/AppHeader";
import { ImagePickerButton } from "../../components/ui/ImagePickerButton";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";
import { apiRegisterMerchant } from "../../services/api/merchantApi";
import { uploadImageToCloudinary } from "../../services/cloudinary/uploadImage";
import { useEvents } from "../../hooks/useEvents";
import { useWalletStore } from "../../store/walletStore";
import { useAuthStore } from "../../store/authStore";
import { EventDisplay } from "../../types/event";
import {
  validateMerchantName,
  validateMerchantDescription,
  validatePublicKey,
} from "../../utils/validators";

export function RegisterMerchantScreen() {
  const router = useRouter();
  const { events, fetchEvents, isLoading: eventsLoading } = useEvents();
  const publicKey = useWalletStore((s) => s.publicKey);
  const role = useAuthStore((s) => s.role);
  const isSuperAdmin = role === "super_admin";

  const [selectedEvent, setSelectedEvent] = useState<EventDisplay | null>(null);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [uploading, setUploading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    fetchEvents();
  }, []);

  // SuperAdmin sees all events, normal admin sees only their own
  const availableEvents = isSuperAdmin
    ? events
    : events.filter((e) => e.admin === publicKey);

  const validate = (): boolean => {
    const newErrors: Record<string, string | null> = {
      name: validateMerchantName(name),
      description: validateMerchantDescription(description),
      walletAddress: validatePublicKey(walletAddress),
      event: selectedEvent ? null : "Please select an event",
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setRegistering(true);
    try {
      let imageUrl: string | undefined;
      if (imageUri) {
        setUploading(true);
        try {
          imageUrl = await uploadImageToCloudinary(imageUri);
        } finally {
          setUploading(false);
        }
      }

      await apiRegisterMerchant({
        eventPda: selectedEvent!.publicKey,
        merchantAuthority: walletAddress,
        name,
        description,
        imageUrl,
      });

      Alert.alert("Success", "Merchant registered!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Failed to register merchant");
    } finally {
      setRegistering(false);
    }
  };

  const handleSelectEvent = (event: EventDisplay) => {
    setSelectedEvent(event);
    setShowEventPicker(false);
    if (errors.event) {
      setErrors((prev) => ({ ...prev, event: null }));
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Register Merchant"
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Event Selector */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Event</Text>
          <TouchableOpacity
            style={[
              styles.eventSelector,
              errors.event ? styles.eventSelectorError : null,
            ]}
            onPress={() => setShowEventPicker(!showEventPicker)}
            activeOpacity={0.7}
          >
            {selectedEvent ? (
              <View style={styles.selectedEventRow}>
                <View style={styles.selectedEventInfo}>
                  <Text style={styles.selectedEventName} numberOfLines={1}>
                    {selectedEvent.name}
                  </Text>
                  <Text style={styles.selectedEventVenue} numberOfLines={1}>
                    {selectedEvent.venue}
                  </Text>
                </View>
                <Ionicons
                  name={showEventPicker ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
            ) : (
              <View style={styles.selectedEventRow}>
                <Text style={styles.placeholderText}>Select an event...</Text>
                <Ionicons
                  name={showEventPicker ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
            )}
          </TouchableOpacity>
          {errors.event && (
            <Text style={styles.errorText}>{errors.event}</Text>
          )}

          {/* Dropdown */}
          {showEventPicker && (
            <View style={styles.eventDropdown}>
              {eventsLoading ? (
                <View style={styles.dropdownLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.dropdownLoadingText}>
                    Loading events...
                  </Text>
                </View>
              ) : availableEvents.length === 0 ? (
                <View style={styles.dropdownEmpty}>
                  <Text style={styles.dropdownEmptyText}>
                    No events found. Create an event first.
                  </Text>
                </View>
              ) : (
                availableEvents.map((event) => (
                  <TouchableOpacity
                    key={event.publicKey}
                    style={[
                      styles.eventOption,
                      selectedEvent?.publicKey === event.publicKey &&
                        styles.eventOptionSelected,
                    ]}
                    onPress={() => handleSelectEvent(event)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.eventOptionInfo}>
                      <Text style={styles.eventOptionName} numberOfLines={1}>
                        {event.name}
                      </Text>
                      <Text style={styles.eventOptionVenue} numberOfLines={1}>
                        {event.venue}
                      </Text>
                    </View>
                    {selectedEvent?.publicKey === event.publicKey && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        <AppInput
          label="Merchant Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Food Stand #1"
          error={errors.name ?? undefined}
          maxLength={64}
        />

        <AppInput
          label="Description (Optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="What does this merchant sell?"
          error={errors.description ?? undefined}
          maxLength={128}
          multiline
          numberOfLines={2}
        />

        <ImagePickerButton
          label="Merchant Image"
          imageUri={imageUri || undefined}
          onImageSelected={setImageUri}
          uploading={uploading}
        />

        <AppInput
          label="Merchant Wallet Address"
          value={walletAddress}
          onChangeText={setWalletAddress}
          placeholder="Solana public key"
          error={errors.walletAddress ?? undefined}
          autoCapitalize="none"
        />

        <AppButton
          title="Register Merchant"
          onPress={handleRegister}
          loading={registering}
          size="lg"
          style={styles.registerButton}
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
  fieldContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  eventSelector: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  eventSelectorError: {
    borderColor: colors.error,
  },
  selectedEventRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedEventInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  selectedEventName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text,
  },
  selectedEventVenue: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  placeholderText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
    marginLeft: 4,
  },
  eventDropdown: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
    overflow: "hidden",
    maxHeight: 240,
  },
  eventOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventOptionSelected: {
    backgroundColor: "rgba(108, 99, 255, 0.08)",
  },
  eventOptionInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  eventOptionName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text,
  },
  eventOptionVenue: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dropdownLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    gap: spacing.sm,
  },
  dropdownLoadingText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  dropdownEmpty: {
    padding: spacing.md,
    alignItems: "center",
  },
  dropdownEmptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
  registerButton: {
    marginTop: spacing.lg,
  },
});
