import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";
import { AppHeader } from "../../components/ui/AppHeader";
import { ImagePickerButton } from "../../components/ui/ImagePickerButton";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing, borderRadius } from "../../theme/spacing";
import { fonts } from "../../theme/fonts";
import { PublicKey } from "@solana/web3.js";
import { apiCreateEvent, apiAddSeatTier } from "../../services/api/eventApi";
import { uploadMetadata } from "../../services/api/uploadApi";
import { uploadImageToCloudinary } from "../../services/cloudinary/uploadImage";
import { useWallet } from "../../hooks/useWallet";
import { findEventPda } from "../../solana/pda";
import { showWarning, showError } from "../../utils/alerts";
import { confirm } from "../../components/ui/ConfirmDialogProvider";
import {
  validateEventName,
  validateVenue,
  validateEventDescription,
} from "../../utils/validators";
import { MAX_EVENT_NAME_LEN } from "../../solana/config/constants";

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
  const { publicKey } = useWallet();
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // Online-only fields
  const [onlinePrice, setOnlinePrice] = useState("");
  const [onlineCapacity, setOnlineCapacity] = useState("");

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

  // Reset all form fields when screen gains focus (expo-router keeps screens mounted)
  useFocusEffect(
    useCallback(() => {
      setName("");
      setVenue("");
      setIsOnline(false);
      setDescription("");
      setImageUri("");
      setErrors({});
      setUploading(false);
      setCreating(false);
      setOnlinePrice("");
      setOnlineCapacity("");
      const d = new Date();
      d.setDate(d.getDate() + 7);
      d.setHours(10, 0, 0, 0);
      setEventDate(d);
      setPickerMode(null);
    }, [])
  );

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
    const priceVal = parseFloat(onlinePrice);
    const capVal = parseInt(onlineCapacity, 10);
    const newErrors: Record<string, string | null> = {
      name: validateEventName(name),
      venue: isOnline ? null : validateVenue(venue),
      description: validateEventDescription(description),
      eventDate:
        eventDate <= new Date() ? "Event date must be in the future" : null,
      onlinePrice: isOnline
        ? !onlinePrice.trim()
          ? "Required"
          : isNaN(priceVal) || priceVal <= 0
          ? "Must be > 0"
          : null
        : null,
      onlineCapacity: isOnline
        ? !onlineCapacity.trim()
          ? "Required"
          : isNaN(capVal) || capVal <= 0
          ? "Must be a whole number > 0"
          : null
        : null,
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

      // Use placeholder values — actual pricing/capacity comes from seat tiers
      await apiCreateEvent({
        name,
        venue: isOnline ? "Online" : venue,
        description,
        imageUrl,
        eventDate,
        ticketPrice: 0.000000001, // placeholder — real price comes from seat tiers
        totalSeats: 10000, // placeholder cap — real limits come from seat tiers
        isOnline,
        metadataUri: await uploadMetadata({
          name: `${name} - Event Collection`,
          symbol: "PASS",
          description: description || `Event: ${name} at ${venue}`,
          image: imageUrl,
          attributes: [
            { trait_type: "Event", value: name },
            { trait_type: "Venue", value: venue },
          ],
        }),
      });

      // Compute the event PDA address from admin wallet + event name
      const adminPubkey = new PublicKey(publicKey!);
      const [eventPda] = findEventPda(adminPubkey, name);
      const eventPdaStr = eventPda.toBase58();

      if (isOnline) {
        // Auto-create a single "General" tier — no seat concept for online events
        await apiAddSeatTier({
          eventPda: eventPdaStr,
          name: "General",
          price: Math.round(parseFloat(onlinePrice) * 1_000_000_000),
          totalSeats: parseInt(onlineCapacity, 10),
          tierLevel: 0,
          isRestricted: false,
        });

        confirm({
          title: "Event Created!",
          message: "Your online event is ready. Ticket holders can join the live meeting directly in-app.",
          type: "success",
          buttons: [
            { text: "Done", style: "default", onPress: () => router.back() },
          ],
        });
      } else {
        confirm({
          title: "Event Created!",
          message: "Now add seat tiers (Bronze, Silver, Gold, VIP) with different prices and capacities.",
          type: "success",
          buttons: [
            { text: "Later", style: "cancel", onPress: () => router.back() },
            {
              text: "Add Seat Tiers",
              style: "default",
              onPress: () =>
                router.replace({
                  pathname: "/(admin)/add-seat-tier",
                  params: { eventKey: eventPdaStr, eventName: name },
                }),
            },
          ],
        });
      }
    } catch (error: any) {
      const msg = error.message ?? "Failed to create event";
      if (
        msg.includes("Cancelled") ||
        msg.includes("CancellationException")
      ) {
        showWarning("Cancelled", "Transaction was cancelled.");
      } else if (msg.includes("already in use")) {
        showWarning("Event Already Exists", `An event named "${name}" already exists for your admin account. Please use a different name.`);
      } else if (msg.includes("AccountNotInitialized")) {
        showError("Admin Not Initialized", "Your admin account needs to be initialized first. Please contact a super admin.");
      } else {
        showError("Error", msg);
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
        showsVerticalScrollIndicator={false}
      >
        {/* Section: Event Details */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="document-text" size={16} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Event Details</Text>
          </View>

          <AppInput
            label="Event Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Solana Hackathon 2026"
            error={errors.name ?? undefined}
            maxLength={MAX_EVENT_NAME_LEN}
          />

          {/* Online / Offline toggle */}
          <View style={styles.eventModeRow}>
            <Text style={styles.eventModeLabel}>Event Mode</Text>
            <View style={styles.eventModeToggle}>
              <TouchableOpacity
                style={[styles.modeBtn, !isOnline && styles.modeBtnActive]}
                onPress={() => setIsOnline(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeBtnText, !isOnline && styles.modeBtnTextActive]}>
                  📍 Offline
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, isOnline && styles.modeBtnActive]}
                onPress={() => setIsOnline(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeBtnText, isOnline && styles.modeBtnTextActive]}>
                  🌐 Online
                </Text>
              </TouchableOpacity>
            </View>
            {isOnline && (
              <Text style={styles.eventModeHint}>
                Ticket holders can join a live audio meeting in-app
              </Text>
            )}
          </View>

          {isOnline && (
            <View style={styles.onlineFieldsRow}>
              <View style={styles.onlineFieldHalf}>
                <AppInput
                  label="Ticket Price (SOL)"
                  value={onlinePrice}
                  onChangeText={setOnlinePrice}
                  placeholder="0.05"
                  keyboardType="decimal-pad"
                  error={errors.onlinePrice ?? undefined}
                />
              </View>
              <View style={styles.onlineFieldHalf}>
                <AppInput
                  label="Max Attendees"
                  value={onlineCapacity}
                  onChangeText={setOnlineCapacity}
                  placeholder="500"
                  keyboardType="number-pad"
                  error={errors.onlineCapacity ?? undefined}
                />
              </View>
            </View>
          )}

          {!isOnline && (
            <AppInput
              label="Venue"
              value={venue}
              onChangeText={setVenue}
              placeholder="e.g. San Francisco, CA"
              error={errors.venue ?? undefined}
              maxLength={128}
            />
          )}

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
        </View>

        {/* Section: Date & Time */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: colors.accentMuted }]}>
              <Ionicons name="calendar" size={16} color={colors.accent} />
            </View>
            <Text style={styles.sectionTitle}>Date & Time</Text>
          </View>

          <View style={styles.dateRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={openDatePicker}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.accent} />
              <Text style={styles.dateText}>
                {formatDisplayDate(eventDate)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timeButton}
              onPress={openTimePicker}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={18} color={colors.accent} />
              <Text style={styles.dateText}>
                {formatDisplayTime(eventDate)}
              </Text>
            </TouchableOpacity>
          </View>
          {errors.eventDate ? (
            <Text style={styles.dateError}>{errors.eventDate}</Text>
          ) : null}
        </View>

        {/* Section: Event Image */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrap, { backgroundColor: colors.secondaryMuted }]}>
              <Ionicons name="image" size={16} color={colors.secondary} />
            </View>
            <Text style={styles.sectionTitle}>Event Image</Text>
          </View>

          <ImagePickerButton
            label="Event Image"
            imageUri={imageUri || undefined}
            onImageSelected={setImageUri}
            uploading={uploading}
          />
        </View>

        {/* Tier Hint */}
        <View style={styles.tierHintCard}>
          <View style={styles.tierHintIcon}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
          </View>
          <Text style={styles.tierHintText}>
            Pricing and seat capacity will be configured in the next step when you add seat tiers (Bronze, Silver, Gold, VIP).
          </Text>
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
              <View style={styles.modalHandle} />
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
                      <Ionicons name="chevron-up" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.pickerValue}>
                      {MONTH_NAMES[tempMonth]}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setTempMonth((m) => (m + 1) % 12)}
                      style={styles.pickerArrow}
                    >
                      <Ionicons name="chevron-down" size={24} color={colors.primary} />
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
                      <Ionicons name="chevron-up" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.pickerValue}>{tempDay}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        const max = daysInMonth(tempMonth, tempYear);
                        setTempDay((d) => (d >= max ? 1 : d + 1));
                      }}
                      style={styles.pickerArrow}
                    >
                      <Ionicons name="chevron-down" size={24} color={colors.primary} />
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
                      <Ionicons name="chevron-up" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.pickerValue}>{tempYear}</Text>
                    <TouchableOpacity
                      onPress={() => setTempYear((y) => y + 1)}
                      style={styles.pickerArrow}
                    >
                      <Ionicons name="chevron-down" size={24} color={colors.primary} />
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
                      <Ionicons name="chevron-up" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.pickerValue}>
                      {formatHour12(tempHour)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setTempHour((h) => (h + 1) % 24)}
                      style={styles.pickerArrow}
                    >
                      <Ionicons name="chevron-down" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.pickerLabel}>Hour</Text>
                  </View>

                  <Text style={styles.pickerColon}>:</Text>

                  <View style={styles.pickerColumn}>
                    <TouchableOpacity
                      onPress={() => setTempMinute((m) => (m + 55) % 60)}
                      style={styles.pickerArrow}
                    >
                      <Ionicons name="chevron-up" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.pickerValue}>
                      {String(tempMinute).padStart(2, "0")}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setTempMinute((m) => (m + 5) % 60)}
                      style={styles.pickerArrow}
                    >
                      <Ionicons name="chevron-down" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.pickerLabel}>Min</Text>
                  </View>

                  <View style={styles.pickerColumn}>
                    <TouchableOpacity
                      onPress={() => setTempHour((h) => (h + 12) % 24)}
                      style={styles.pickerArrow}
                    >
                      <Ionicons name="chevron-up" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.pickerValue}>
                      {tempHour < 12 ? "AM" : "PM"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setTempHour((h) => (h + 12) % 24)}
                      style={styles.pickerArrow}
                    >
                      <Ionicons name="chevron-down" size={24} color={colors.primary} />
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
                  <LinearGradient
                    colors={colors.gradientPrimary as unknown as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalConfirmGradient}
                  >
                    <Text style={styles.modalConfirmText}>Done</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <AppButton
          title="Create Event"
          onPress={handleCreate}
          loading={creating}
          icon="add-circle"
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

  // Online price + capacity fields
  onlineFieldsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  onlineFieldHalf: {
    flex: 1,
  },

  // Online/Offline toggle
  eventModeRow: {
    marginBottom: spacing.sm,
  },
  eventModeLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  eventModeToggle: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.background,
  },
  modeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  modeBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  modeBtnTextActive: {
    color: colors.primary,
  },
  eventModeHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontStyle: "italic",
  },

  // Section Cards
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },

  // Tier Hint
  tierHintCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.primaryMuted,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  tierHintIcon: {
    marginTop: 1,
  },
  tierHintText: {
    flex: 1,
    ...typography.bodySm,
    color: colors.primary,
    lineHeight: 20,
  },

  // Date section
  dateRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  dateText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.text,
  },
  dateError: {
    ...typography.small,
    color: colors.error,
    marginTop: spacing.xs,
  },

  // Picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
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
  pickerValue: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  pickerLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
    borderRadius: borderRadius.md,
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
    borderRadius: borderRadius.md,
    overflow: "hidden",
  },
  modalConfirmGradient: {
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  modalConfirmText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.background,
  },
});
