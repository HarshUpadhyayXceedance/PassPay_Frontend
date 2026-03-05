const fs = require("fs");
const path = require("path");

// Resolve google-services.json: EAS secret file takes precedence,
// then local file (if it exists), otherwise omit (local prebuild without Firebase).
const localGsPath = path.resolve(__dirname, "./android/app/google-services.json");
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ??
  (fs.existsSync(localGsPath) ? "./android/app/google-services.json" : undefined);

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: "PassPay",
    slug: "passpay-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    scheme: "passpay",
    newArchEnabled: true,
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#0A0E1A",
    },
    ios: {
      bundleIdentifier: "com.passpay.mobile",
      supportsTablet: true,
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: ["passpay"],
          },
        ],
        NSMicrophoneUsageDescription:
          "PassPay needs microphone access to speak in live event meetings and community rooms.",
        NSCameraUsageDescription:
          "PassPay needs camera access to scan QR codes and take event photos.",
      },
    },
    android: {
      package: "com.passpay.mobile",
      // EAS secret (GOOGLE_SERVICES_JSON) → local file → omitted for plain local prebuild
      ...(googleServicesFile ? { googleServicesFile } : {}),
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0A0E1A",
      },
      edgeToEdgeEnabled: false,
      predictiveBackGestureEnabled: false,
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "passpay",
              host: "*",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.CAMERA",
        "android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION",
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-secure-store",
      "expo-router",
      "expo-font",
      [
        "expo-image-picker",
        {
          photosPermission: "PassPay needs access to your photos to add event images.",
          cameraPermission: "PassPay needs access to your camera to take event photos.",
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission: "PassPay needs access to your camera to scan QR codes.",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#00FFA3",
        },
      ],
    ],
    extra: {
      router: {},
      eas: {
        projectId: "6e4e71f5-da0f-4fbc-a3ed-b2f3d930e942",
      },
    },
    owner: "harshupadhyay798557",
  },
};
