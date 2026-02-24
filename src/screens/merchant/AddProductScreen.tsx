import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";
import { AppHeader } from "../../components/ui/AppHeader";
import { ImagePickerButton } from "../../components/ui/ImagePickerButton";
import { uploadImageToCloudinary } from "../../services/cloudinary/uploadImage";
import { apiAddProduct } from "../../services/api/eventApi";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";

export function AddProductScreen() {
  const router = useRouter();
  const { eventKey } = useLocalSearchParams<{
    eventKey: string;
    merchantKey?: string;
  }>();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  useFocusEffect(
    useCallback(() => {
      setName("");
      setDescription("");
      setPrice("");
      setImageUri("");
      setErrors({});
      setUploading(false);
      setCreating(false);
    }, [])
  );

  const validate = (): boolean => {
    const newErrors: Record<string, string | null> = {
      name: !name.trim()
        ? "Product name is required"
        : name.length > 64
        ? "Max 64 characters"
        : null,
      description:
        description.length > 128 ? "Max 128 characters" : null,
      price:
        !price.trim()
          ? "Price is required"
          : isNaN(parseFloat(price)) || parseFloat(price) <= 0
          ? "Must be a positive number"
          : null,
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleCreate = async () => {
    if (!validate() || !eventKey) return;

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

      await apiAddProduct({
        eventPda: eventKey,
        name: name.trim(),
        description: description.trim(),
        price: Math.round(parseFloat(price) * 1_000_000_000),
        imageUrl,
      });

      Alert.alert("Product Added", `"${name}" has been added to your catalog.`, [
        {
          text: "Add Another",
          onPress: () => {
            setName("");
            setDescription("");
            setPrice("");
            setImageUri("");
            setErrors({});
          },
        },
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const msg = error.message ?? "Failed to add product";
      if (msg.includes("already in use")) {
        Alert.alert("Product Exists", `A product named "${name}" already exists.`);
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Add Product" onBack={() => router.back()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AppInput
          label="Product Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Event T-Shirt"
          error={errors.name ?? undefined}
          maxLength={64}
        />

        <AppInput
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the product..."
          error={errors.description ?? undefined}
          maxLength={128}
          multiline
          numberOfLines={3}
        />

        <AppInput
          label="Price (SOL)"
          value={price}
          onChangeText={setPrice}
          placeholder="0.05"
          keyboardType="decimal-pad"
          error={errors.price ?? undefined}
        />

        <ImagePickerButton
          label="Product Image (optional)"
          imageUri={imageUri || undefined}
          onImageSelected={setImageUri}
          uploading={uploading}
        />

        <AppButton
          title={creating ? "Adding..." : "Add Product"}
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
