import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { API_URL } from "@/constants/api";
import { setupPartnerNotificationTapHandler } from "@/services/notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef } from "react";
import { AppState, useColorScheme } from "react-native";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
SplashScreen.preventAutoHideAsync();
export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AuthStatusCheck />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
function AuthStatusCheck() {
  const router = useRouter();
  const notificationTapInProgress = useRef(false);
  const checking = useRef(false);
  const checkPartnerStatus = useCallback(async () => {
    if (checking.current || notificationTapInProgress.current) return;
    checking.current = true;
    try {
      const partnerMobile = await AsyncStorage.getItem("partnerMobile");
      if (!partnerMobile || notificationTapInProgress.current) return;
      const response = await fetch(
        `${API_URL}/api/salons/partner/${partnerMobile}`,
      );
      if (!response.ok || notificationTapInProgress.current) return;
      const data = await response.json();
      if (notificationTapInProgress.current) return;
      const partner = data?.partner;
      const salon = data?.salon;
      console.log("Partner Status Check:", partner?.status);
      console.log("Salon Status Check:", salon?.status);
      if (partner?.status === "SUSPENDED") {
        router.replace("/account-suspended" as any);
      } else if (salon?.status === "REJECTED") {
        router.replace("/partner/correction" as any);
      } else if (salon?.status === "PENDING") {
        router.replace("/partner/verification" as any);
      } else if (salon?.status === "APPROVED") {
        router.replace("/(tabs)" as any);
      }
    } catch (error) {
      console.log("Partner status check error:", error);
    } finally {
      checking.current = false;
    }
  }, [router]);
  useEffect(() => {
    checkPartnerStatus();
    const unsubscribe = setupPartnerNotificationTapHandler(() => {
      notificationTapInProgress.current = true;
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && !notificationTapInProgress.current) {
        checkPartnerStatus();
      }
    });
    return () => {
      subscription.remove();
      unsubscribe();
    };
  }, [checkPartnerStatus]);
  return null;
}
