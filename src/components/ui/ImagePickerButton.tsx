import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";

interface ImagePickerButtonProps {
  imageUri?: string | null;
  onImageSelected: (uri: string) => void;
  label?: string;
  error?: string;
  uploading?: boolean;
}

export function ImagePickerButton({
  imageUri,
  onImageSelected,
  label = "Event Image",
  error,
  uploading,
}: ImagePickerButtonProps) {
  const handlePickerCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Camera permission is required to take photos."
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      onImageSelected(result.assets[0].uri);
    }
  };

  const handlePickerGallery = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Gallery permission is required to pick photos."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      onImageSelected(result.assets[0].uri);
    }
  };

  const handlePress = () => {
    Alert.alert("Select Image", "Choose a source", [
      { text: "Camera", onPress: handlePickerCamera },
      { text: "Gallery", onPress: handlePickerGallery },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.picker, error ? styles.pickerError : null]}
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={uploading}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        ) : (
          <View style={styles.placeholder}>
            {uploading ? (
              <>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.placeholderText}>Uploading...</Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="camera-outline"
                  size={32}
                  color={colors.textMuted}
                />
                <Text style={styles.placeholderText}>Tap to add image</Text>
              </>
            )}
          </View>
        )}
        {imageUri && !uploading ? (
          <View style={styles.changeOverlay}>
            <Ionicons name="camera" size={16} color="#fff" />
            <Text style={styles.changeText}>Change</Text>
          </View>
        ) : null}
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  picker: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  pickerError: {
    borderColor: colors.error,
  },
  preview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  placeholderText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  changeOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 8,
  },
  changeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: "#fff",
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
