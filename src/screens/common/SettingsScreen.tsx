import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "../../components/ui/AppHeader";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing, borderRadius } from "../../theme/spacing";
import { getCurrentNetwork, setNetwork, NetworkType } from "../../solana/config/connection";

export function SettingsScreen() {
  const navigation = useNavigation();
  const [currentNetwork, setCurrentNetwork] = React.useState<NetworkType>(
    getCurrentNetwork()
  );

  const toggleNetwork = () => {
    const newNetwork =
      currentNetwork === "devnet" ? "mainnet-beta" : "devnet";
    setNetwork(newNetwork);
    setCurrentNetwork(newNetwork);
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Settings" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content}>
        <SettingRow
          label="Network"
          value={currentNetwork === "devnet" ? "Devnet" : "Mainnet"}
          onPress={toggleNetwork}
        />

        <SettingRow
          label="About"
          value=""
          onPress={() => (navigation as any).navigate("About")}
        />
      </ScrollView>
    </View>
  );
}

function SettingRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={settingStyles.row} onPress={onPress}>
      <Text style={settingStyles.label}>{label}</Text>
      <Text style={settingStyles.value}>{value} ›</Text>
    </TouchableOpacity>
  );
}

const settingStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    ...typography.body,
    color: colors.text,
  },
  value: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
});
