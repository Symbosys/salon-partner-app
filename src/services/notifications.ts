import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";
export function setupPartnerNotificationTapHandler(
  onNotificationTap?: () => void,
) {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      onNotificationTap?.();
      const type = String(data?.type || "").toUpperCase();
      const screen = String(data?.screen || "").toLowerCase();
      console.log("PARTNER NOTIFICATION TAPPED:", data);
      console.log("NOTIFICATION TYPE:", type);
      console.log("NOTIFICATION SCREEN:", screen);
      if (
        type.includes("SUSPENDED") ||
        screen === "account-suspended" ||
        screen === "suspended"
      ) {
        router.replace("/account-suspended" as any);
        return;
      }
      if (
        type.includes("BOOKING") ||
        screen === "bookings" ||
        screen === "booking" ||
        screen === "bookingdetails"
      ) {
        const isCancelled =
          type.includes("CANCEL") ||
          screen === "rejected" ||
          String(data?.status || "").toUpperCase() === "CANCELLED";
        router.replace(
          isCancelled
            ? ("/(tabs)/bookings?tab=rejected" as any)
            : ("/(tabs)/bookings" as any),
        );
        return;
      }
      if (
        type.includes("APPROVED") ||
        screen === "dashboard" ||
        screen === "home"
      ) {
        router.replace("/(tabs)");
        return;
      }
      if (type.includes("REJECTED") || screen === "correction") {
        router.replace("/partner/correction" as any);
        return;
      }
      if (type.includes("SUBMITTED") || screen === "verification") {
        router.replace("/partner/verification" as any);
      }
    },
  );
  return () => subscription.remove();
}
export async function registerForPushNotificationsAsync() {
  try {
    if (!Device.isDevice) {
      console.log("Push notifications require a physical device.");
      return null;
    }
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("Notification permission was not granted.");
      return null;
    }
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const devicePushToken = await Notifications.getDevicePushTokenAsync();
    const fcmToken = devicePushToken.data;
    console.log("PARTNER FCM DEVICE TOKEN:", fcmToken);
    const storedPartnerId = await AsyncStorage.getItem("partnerId");
    console.log("FCM STORED PARTNER ID:", storedPartnerId);
    if (!storedPartnerId) {
      console.log("Partner ID not found in AsyncStorage.");
      return fcmToken;
    }
    const partnerId = Number(storedPartnerId);
    if (!Number.isInteger(partnerId) || partnerId <= 0) {
      console.log("Invalid Partner ID:", storedPartnerId);
      return fcmToken;
    }
    const response = await fetch(`${API_URL}/api/notifications/device-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: fcmToken,
        platform: Platform.OS,
        deviceType: Device.deviceName || "Android Device",
        partnerId: Number(partnerId),
      }),
    });
    const data = await response.json();
    console.log("PARTNER FCM TOKEN REGISTER RESPONSE:", response.status);
    console.log("PARTNER FCM TOKEN REGISTER DATA:", data);
    if (!response.ok) {
      console.log("Failed to register Partner FCM token.");
    }
    return fcmToken;
  } catch (error) {
    console.error("Partner FCM registration error:", error);
    return null;
  }
}
