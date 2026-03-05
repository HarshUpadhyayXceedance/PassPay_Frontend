import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";

/**
 * Firebase configuration — project: passpay-69fb3
 * Using Firebase JS SDK (not @react-native-firebase) — works without native builds.
 *
 * ⚠️  DATABASE_URL: Go to Firebase Console → Realtime Database → copy the URL.
 *     It will look like: https://passpay-69fb3-default-rtdb.firebaseio.com
 *     Make sure Realtime Database is enabled in the Firebase Console for this project.
 */
const FIREBASE_DATABASE_URL = "https://passpay-69fb3-default-rtdb.firebaseio.com";

const firebaseConfig = {
  apiKey: "AIzaSyDp8R4NB78-F4Atfy0zUtv8aXabRGlYmbg",
  projectId: "passpay-69fb3",
  databaseURL: FIREBASE_DATABASE_URL,
  storageBucket: "passpay-69fb3.firebasestorage.app",
  messagingSenderId: "419340418994",
  appId: "1:419340418994:android:7b632327c6e1c868196eab",
};

// Prevent duplicate app initialization (hot reloads)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const firebaseDb = getDatabase(app);
