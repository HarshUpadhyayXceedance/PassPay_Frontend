import AsyncStorage from "@react-native-async-storage/async-storage";

export async function saveItem(key: string, value: any): Promise<void> {
  const json = JSON.stringify(value);
  await AsyncStorage.setItem(key, json);
}

export async function getItem<T>(key: string): Promise<T | null> {
  const json = await AsyncStorage.getItem(key);
  if (!json) return null;
  return JSON.parse(json) as T;
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.clear();
}

export const STORAGE_KEYS = {
  USER_ROLE: "user_role",
  ONBOARDED: "has_onboarded",
  NETWORK: "selected_network",
} as const;
