// Placeholder for push notification service
// Will be implemented with expo-notifications when needed

export async function registerForPushNotifications(): Promise<string | null> {
  // TODO: Implement with expo-notifications
  console.warn("Push notifications not yet implemented");
  return null;
}

export async function scheduleLocalNotification(
  title: string,
  body: string
): Promise<void> {
  // TODO: Implement with expo-notifications
  console.warn("Local notifications not yet implemented:", title, body);
}
