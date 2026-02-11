import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";
import { AppHeader } from "../../components/ui/AppHeader";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { apiRegisterMerchant } from "../../services/api/merchantApi";
import {
  validateMerchantName,
  validatePublicKey,
} from "../../utils/validators";
import { AdminStackParamList } from "../../types/navigation";

type Nav = NativeStackNavigationProp<AdminStackParamList, "RegisterMerchant">;
type Route = RouteProp<AdminStackParamList, "RegisterMerchant">;

export function RegisterMerchantScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [name, setName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [registering, setRegistering] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const validate = (): boolean => {
    const newErrors = {
      name: validateMerchantName(name),
      walletAddress: validatePublicKey(walletAddress),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setRegistering(true);
    try {
      await apiRegisterMerchant({
        eventPda: route.params.eventKey,
        merchantAuthority: walletAddress,
        name,
      });

      Alert.alert("Success", "Merchant registered!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Failed to register merchant");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Register Merchant"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AppInput
          label="Merchant Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Food Stand #1"
          error={errors.name ?? undefined}
          maxLength={64}
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
  registerButton: {
    marginTop: spacing.lg,
  },
});
