import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { AppButton } from "../ui/AppButton";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing } from "../../theme/spacing";

interface QRScannerProps {
  onScan: (data: string) => void;
  title?: string;
}

export function QRScanner({ onScan, title = "Scan QR Code" }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera access is needed to scan QR codes
        </Text>
        <AppButton title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={
            scanned
              ? undefined
              : ({ data }) => {
                  setScanned(true);
                  onScan(data);
                }
          }
        />
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
        </View>
      </View>
      {scanned && (
        <AppButton
          title="Scan Again"
          onPress={() => setScanned(false)}
          variant="outline"
          style={styles.rescanButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  permissionText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    borderRadius: 16,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  rescanButton: {
    marginTop: spacing.md,
  },
});
