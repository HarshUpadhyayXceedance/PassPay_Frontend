import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";
import { AppHeader } from "../../components/ui/AppHeader";
import { ImagePickerButton } from "../../components/ui/ImagePickerButton";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";
import { fonts } from "../../theme/fonts";
import { apiCreateEvent } from "../../services/api/eventApi";
import { uploadImageToCloudinary } from "../../services/cloudinary/uploadImage";
import {
  validateEventName,
  validateVenue,
  validateEventDescription,
  validateTicketPrice,
  validateTotalSeats,
} from "../../utils/validators";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function daysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatHour12(hour: number): string {
  const h = hour % 12;
  return h === 0 ? "12" : String(h);
}

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

  // Date picker state
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(10, 0, 0, 0);
    return d;
  });
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [tempMonth, setTempMonth] = useState(0);
  const [tempDay, setTempDay] = useState(1);
  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const [tempHour, setTempHour] = useState(10);
  const [tempMinute, setTempMinute] = useState(0);

  const openDatePicker = () => {
    setTempMonth(eventDate.getMonth());
    setTempDay(eventDate.getDate());
    setTempYear(eventDate.getFullYear());
    setPickerMode("date");
  };

  const openTimePicker = () => {
    setTempHour(eventDate.getHours());
    setTempMinute(eventDate.getMinutes());
    setPickerMode("time");
  };

  const confirmPicker = () => {
    const updated = new Date(eventDate);
    if (pickerMode === "date") {
      const maxDay = daysInMonth(tempMonth, tempYear);
      updated.setFullYear(tempYear, tempMonth, Math.min(tempDay, maxDay));
    } else {
      updated.setHours(tempHour, tempMinute);
    }
    setEventDate(updated);
    setPickerMode(null);
  };

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDisplayTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string | null> = {
      name: validateEventName(name),
      venue: validateVenue(venue),
      description: validateEventDescription(description),
      ticketPrice: validateTicketPrice(ticketPrice),
      totalSeats: validateTotalSeats(totalSeats),
      eventDate:
        eventDate <= new Date() ? "Event date must be in the future" : null,
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleCreate = async () => {
    if (!validate()) return;

    setCreating(true);
    try {
      let imageUrl = "";
      if (imageUri) {
        setUploading(true);
        try {
          imageUrl = await uploadImageToCloudinary(imageUri);
        } finally {
          setUploading(false);
        }
      }

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
      if (
        msg.includes("Cancelled") ||
        msg.includes("CancellationException")
      ) {
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

        {/* Date & Time Picker */}
        <View style={styles.dateSection}>
          <Text style={styles.dateLabel}>Event Date & Time</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={openDatePicker}
              activeOpacity={0.7}
            >
              <Text style={styles.dateIcon}>📅</Text>
              <Text style={styles.dateText}>
                {formatDisplayDate(eventDate)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timeButton}
              onPress={openTimePicker}
              activeOpacity={0.7}
            >
              <Text style={styles.dateIcon}>🕐</Text>
              <Text style={styles.dateText}>
                {formatDisplayTime(eventDate)}
              </Text>
            </TouchableOpacity>
          </View>
          {errors.eventDate ? (
            <Text style={styles.dateError}>{errors.eventDate}</Text>
          ) : null}
        </View>

        {/* Custom Date/Time Picker Modal */}
        <Modal
          visible={pickerMode !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setPickerMode(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {pickerMode === "date" ? "Select Date" : "Select Time"}
              </Text>

              {pickerMode === "date" && (
                <View style={styles.pickerColumns}>
                  <View style={styles.pickerColumn}>
                    <TouchableOpacity
                      onPress={() => setTempMonth((m) => (m + 11) % 12)}
                      style={styles.pickerArrow}
                    >
                      <Text style={styles.arrowText}>▲</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerValue}>
                      {MONTH_NAMES[tempMonth]}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setTempMonth((m) => (m + 1) % 12)}
                      style={styles.pickerArrow}
                    >
                      <Text style={styles.arrowText}>▼</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerLabel}>Month</Text>
                  </View>

                  <View style={styles.pickerColumn}>
                    <TouchableOpacity
                      onPress={() => {
                        const max = daysInMonth(tempMonth, tempYear);
                        setTempDay((d) => (d <= 1 ? max : d - 1));
                      }}
                      style={styles.pickerArrow}
                    >
                      <Text style={styles.arrowText}>▲</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerValue}>{tempDay}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        const max = daysInMonth(tempMonth, tempYear);
                        setTempDay((d) => (d >= max ? 1 : d + 1));
                      }}
                      style={styles.pickerArrow}
                    >
                      <Text style={styles.arrowText}>▼</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerLabel}>Day</Text>
                  </View>

                  <View style={styles.pickerColumn}>
                    <TouchableOpacity
                      onPress={() =>
                        setTempYear((y) =>
                          Math.max(new Date().getFullYear(), y - 1)
                        )
                      }
                      style={styles.pickerArrow}
                    >
                      <Text style={styles.arrowText}>▲</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerValue}>{tempYear}</Text>
                    <TouchableOpacity
                      onPress={() => setTempYear((y) => y + 1)}
                      style={styles.pickerArrow}
                    >
                      <Text style={styles.arrowText}>▼</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerLabel}>Year</Text>
                  </View>
                </View>
              )}

              {pickerMode === "time" && (
                <View style={styles.pickerColumns}>
                  <View style={styles.pickerColumn}>
                    <TouchableOpacity
                      onPress={() => setTempHour((h) => (h + 23) % 24)}
                      style={styles.pickerArrow}
                    >
                      <Text style={styles.arrowText}>▲</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerValue}>
                      {formatHour12(tempHour)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setTempHour((h) => (h + 1) % 24)}
                      style={styles.pickerArrow}
                    >
                      <Text style={styles.arrowText}>▼</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerLabel}>Hour</Text>
                  </View>

                  <Text style={styles.pickerColon}>:</Text>

                  <View style={styles.pickerColumn}>
                    <TouchableOpacity
                      onPress={() => setTempMinute((m) => (m + 55) % 60)}
                      style={styles.pickerArrow}
                    >
                      <Text style={styles.arrowText}>▲</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerValue}>
                      {String(tempMinute).padStart(2, "0")}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setTempMinute((m) => (m + 5) % 60)}
                      style={styles.pickerArrow}
                    >
                      <Text style={styles.arrowText}>▼</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerLabel}>Min</Text>
                  </View>

                  <View style={styles.pickerColumn}>
                    <TouchableOpacity
                      onPress={() => setTempHour((h) => (h + 12) % 24)}
                      style={styles.pickerArrow}
                    >
                      <Text style={styles.arrowText}>▲</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerValue}>
                      {tempHour < 12 ? "AM" : "PM"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setTempHour((h) => (h + 12) % 24)}
                      style={styles.pickerArrow}
                    >
                      <Text style={styles.arrowText}>▼</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => setPickerMode(null)}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmPicker}
                  style={styles.modalConfirmBtn}
                >
                  <Text style={styles.modalConfirmText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
  dateSection: {
    marginBottom: spacing.md,
  },
  dateLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dateRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  dateIcon: {
    fontSize: 16,
  },
  dateText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text,
  },
  dateError: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
  // Custom date/time picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  pickerColumns: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  pickerColumn: {
    alignItems: "center",
    minWidth: 60,
  },
  pickerArrow: {
    padding: spacing.sm,
  },
  arrowText: {
    fontSize: 22,
    color: colors.primary,
  },
  pickerValue: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  pickerLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  pickerColon: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  modalCancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  modalConfirmText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: "#fff",
  },
});
