import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

type AppRoute =
  | "/partner/login"
  | "/partner/registration"
  | "/partner/correction"
  | "/partner/verification"
  | "/account-suspended"
  | "/(tabs)";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<AppRoute>("/partner/login");

  useEffect(() => {
    let isMounted = true;

    const checkPartnerSession = async () => {
      try {
        const mobile = await AsyncStorage.getItem("partnerMobile");

        if (!mobile) {
          if (isMounted) setRoute("/partner/login");
          return;
        }

        const response = await fetch(`${API_URL}/api/salons/partner/${mobile}`);

        if (!response.ok) {
          if (isMounted) setRoute("/partner/login");
          return;
        }

        const data = await response.json();

        console.log("Startup Partner Check:", response.status, data);

        if (data?.registered !== true) {
          if (isMounted) setRoute("/partner/registration");
          return;
        }

        const partner = data?.partner;
        const salon = data?.salon;

        if (partner?.status === "SUSPENDED") {
          if (isMounted) setRoute("/account-suspended");
          return;
        }

        if (salon?.status === "REJECTED") {
          if (isMounted) setRoute("/partner/correction");
          return;
        }

        if (salon?.status === "PENDING") {
          if (isMounted) setRoute("/partner/verification");
          return;
        }

        if (salon?.status === "APPROVED") {
          if (isMounted) setRoute("/(tabs)");
          return;
        }

        if (isMounted) setRoute("/partner/registration");
      } catch (error) {
        console.error("Startup Partner Check Error:", error);

        // Network error par registration status assume mat karo.
        if (isMounted) setRoute("/partner/login");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkPartnerSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FFFFFF",
        }}
      >
        <ActivityIndicator size="large" color="#5B3CC4" />
      </View>
    );
  }

  return <Redirect href={route as any} />;
}
