import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<string>("/partner/login");

  useEffect(() => {
    const checkPartnerSession = async () => {
      try {
        const mobile = await AsyncStorage.getItem("partnerMobile");

        if (!mobile) {
          setRoute("/partner/login");
          return;
        }

        const response = await fetch(`${API_URL}/api/salons/partner/${mobile}`);

        const data = await response.json();

        console.log("Startup Partner Check:", response.status, data);

        if (!response.ok || data?.registered !== true) {
          setRoute("/partner/registration");
          return;
        }

        const salon = data?.salon;

        if (salon?.status === "REJECTED") {
          setRoute("/partner/correction");
          return;
        }

        if (salon?.status === "PENDING") {
          setRoute("/partner/verification");
          return;
        }

        if (salon?.status === "APPROVED") {
          setRoute("/(tabs)");
          return;
        }

        setRoute("/partner/registration");
      } catch (error) {
        console.error("Startup Partner Check Error:", error);

        setRoute("/partner/registration");
      } finally {
        setLoading(false);
      }
    };

    checkPartnerSession();
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#5B3CC4" />
      </View>
    );
  }

  return <Redirect href={route as any} />;
}
