import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

const GOOGLE_MAPS_API_KEY =
  Constants.expoConfig?.extra?.googleMapsWebApiKey || "";

export default function HomeScreen() {
  const [isLive, setIsLive] = useState(false);
  const [salonName, setSalonName] = useState("Salon");
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [selectedLatitude, setSelectedLatitude] = useState<number | null>(null);
  const [selectedLongitude, setSelectedLongitude] = useState<number | null>(
    null,
  );
  const [selectedAddress, setSelectedAddress] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedPincode, setSelectedPincode] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const locationWebViewRef = useRef<WebView>(null);

  const [locationError, setLocationError] = useState("");
  const [loadingLive, setLoadingLive] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [todayBookings, setTodayBookings] = useState(0);
  const [todayPending, setTodayPending] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [monthlyServices, setMonthlyServices] = useState(0);

  const reverseGeocodeLocation = async (
    latitude: number,
    longitude: number,
  ) => {
    try {
      setLocationLoading(true);
      setLocationError("");

      const response = await fetch(
        `${API_URL}/api/salons/reverse-geocode?latitude=${latitude}&longitude=${longitude}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error("Reverse geocoding failed");
      }

      const result = data?.results?.[0];

      if (!result) {
        throw new Error("Address not found");
      }

      const components = result.address_components || [];

      const getComponent = (type: string) => {
        const component = components.find((item: any) =>
          item.types?.includes(type),
        );

        return component?.long_name || "";
      };

      const detectedCity =
        getComponent("locality") ||
        getComponent("administrative_area_level_2") ||
        "";

      const detectedState = getComponent("administrative_area_level_1");
      const detectedPincode = getComponent("postal_code");

      const detectedAddress = components
        .filter((item: any) => {
          const types = item.types || [];

          return (
            types.includes("route") ||
            types.includes("street_address") ||
            types.includes("premise") ||
            types.includes("subpremise") ||
            types.includes("neighborhood") ||
            types.includes("sublocality")
          );
        })
        .map((item: any) => item.long_name)
        .filter(Boolean)
        .join(", ");

      setSelectedAddress(
        detectedAddress || result.formatted_address || "Selected location",
      );
      setSelectedCity(detectedCity);
      setSelectedState(detectedState);
      setSelectedPincode(detectedPincode);

      return {
        address:
          detectedAddress || result.formatted_address || "Selected location",
        city: detectedCity,
        state: detectedState,
        pincode: detectedPincode,
      };
    } catch (error) {
      console.error("Reverse Geocode Error:", error);
      setLocationError("Unable to get address for this location.");
      return null;
    } finally {
      setLocationLoading(false);
    }
  };

  const getCurrentLocationForModal = async () => {
    try {
      setLocationLoading(true);
      setLocationError("");

      const permission = await Location.getForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        if (!permission.canAskAgain) {
          setLocationError(
            "Location permission is disabled. Please enable it from Settings.",
          );
          return;
        }

        const requestedPermission =
          await Location.requestForegroundPermissionsAsync();

        if (requestedPermission.status !== "granted") {
          setLocationError("Location permission is required.");
          return;
        }
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = currentLocation.coords;

      setSelectedLatitude(latitude);
      setSelectedLongitude(longitude);

      locationWebViewRef.current?.injectJavaScript(`
      if (window.moveMarker) {
        window.moveMarker(${latitude}, ${longitude});
      }
      true;
    `);

      await reverseGeocodeLocation(latitude, longitude);
    } catch (error) {
      console.error("Current Location Error:", error);
      setLocationError("Unable to detect your current location.");
    } finally {
      setLocationLoading(false);
    }
  };

  const openLocationModal = async () => {
    setLocationError("");
    setLocationModalVisible(true);

    // Existing salon location
    if (selectedLatitude !== null && selectedLongitude !== null) {
      setLocationSearch("");
      return;
    }

    // Automatically detect current location
    await getCurrentLocationForModal();
  };

  const searchLocationOnMap = () => {
    const query = locationSearch.trim();

    if (!query) {
      setLocationSuggestions([]);
      return;
    }

    locationWebViewRef.current?.injectJavaScript(`
    if (window.searchLocation) {
      window.searchLocation(${JSON.stringify(query)});
    }
    true;
  `);
  };

  const handleLocationSearchChange = (text: string) => {
    setLocationSearch(text);

    if (!text.trim()) {
      setLocationSuggestions([]);
      return;
    }

    locationWebViewRef.current?.injectJavaScript(`
    if (window.getLocationSuggestions) {
      window.getLocationSuggestions(${JSON.stringify(text)});
    }
    true;
  `);
  };

  // ==========================================================
  // LOAD PARTNER NOTIFICATION STATUS
  // ==========================================================

  const fetchNotificationStatus = useCallback(async () => {
    try {
      const mobile = await AsyncStorage.getItem("partnerMobile");

      if (!mobile) {
        return;
      }

      const response = await fetch(
        `${API_URL}/api/notifications/partner/${mobile}`,
      );

      const data = await response.json();

      if (!response.ok || !Array.isArray(data)) {
        return;
      }

      const hasUnread = data.some(
        (notification: any) => notification.isRead === false,
      );

      setHasUnreadNotifications(hasUnread);
    } catch (error) {
      console.log("Fetch Partner Notification Status Error:", error);
    }
  }, []);

  const loadSalon = async () => {
    try {
      const mobile = await AsyncStorage.getItem("partnerMobile");

      if (!mobile) {
        return;
      }

      const response = await fetch(`${API_URL}/api/salons/partner/${mobile}`);

      const data = await response.json();

      if (response.ok && data.salon) {
        setSalonName(data.salon.name || "Salon");
        setIsLive(Boolean(data.salon.isLive));

        // Saved salon location
        const salon = data.salon;

        if (
          salon.latitude !== null &&
          salon.latitude !== undefined &&
          salon.longitude !== null &&
          salon.longitude !== undefined
        ) {
          setSelectedLatitude(Number(salon.latitude));
          setSelectedLongitude(Number(salon.longitude));
        }

        const savedAddress = [
          salon.address,
          salon.city,
          salon.state,
          salon.pincode,
        ]
          .filter(Boolean)
          .join(", ");

        setSelectedAddress(savedAddress);

        // Save locally for immediate access
        await AsyncStorage.setItem(
          "partnerLocation",
          JSON.stringify({
            latitude: salon.latitude,
            longitude: salon.longitude,
            address: savedAddress,
          }),
        );
      }
    } catch (error) {
      console.error("Load Salon Error:", error);
    }
  };

  const loadTodayStats = async () => {
    try {
      const mobile = await AsyncStorage.getItem("partnerMobile");

      if (!mobile) return;

      const response = await fetch(
        `${API_URL}/api/bookings/partner/${mobile}/today-stats`,
      );

      const data = await response.json();

      if (response.ok) {
        setTodayBookings(data.bookings || 0);
        setTodayPending(data.pending || 0);
        setTodayEarnings(Number(data.earnings || 0));
      } else {
        console.log("Today Stats Error:", data);
      }
    } catch (error) {
      console.error("Load Today Stats Error:", error);
    }
  };

  const loadTodayAppointments = async () => {
    try {
      const mobile = await AsyncStorage.getItem("partnerMobile");

      if (!mobile) return;

      const response = await fetch(
        `${API_URL}/api/bookings/partner/${mobile}/today-appointments`,
      );

      const data = await response.json();

      if (response.ok) {
        setTodayAppointments(
          Array.isArray(data)
            ? data.filter((booking: any) => booking.status !== "CANCELLED")
            : [],
        );
      } else {
        console.log("Today Appointments Error:", data);
      }
    } catch (error) {
      console.error("Load Today Appointments Error:", error);
    }
  };

  const loadMonthlyEarnings = async () => {
    try {
      const mobile = await AsyncStorage.getItem("partnerMobile");

      if (!mobile) return;

      const response = await fetch(
        `${API_URL}/api/bookings/partner/${mobile}/monthly-earnings`,
      );

      const data = await response.json();

      if (response.ok) {
        setMonthlyEarnings(Number(data.monthlyEarnings || 0));
        setMonthlyServices(Number(data.completedCount || 0));
      } else {
        console.log("Monthly Earnings Error:", data);
      }
    } catch (error) {
      console.error("Load Monthly Earnings Error:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSalon();
      loadTodayStats();
      loadTodayAppointments();
      loadMonthlyEarnings();
      fetchNotificationStatus();
    }, [fetchNotificationStatus]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.salonName}>{salonName}</Text>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={openLocationModal}
              style={{
                marginTop: 6,
                width: "70%",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  fontSize: 12,
                  color: "#111",
                  fontWeight: "600",
                }}
              >
                📍 {selectedAddress || "Set your location"}
              </Text>

              <View
                style={{
                  width: 22,
                  height: 22,
                  marginLeft: 6,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRightWidth: 2,
                    borderBottomWidth: 2,
                    borderColor: "#555",
                    transform: [{ rotate: "45deg" }],
                    marginTop: -4,
                  }}
                />
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              router.push("/partner-notifications" as any);
            }}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 8,
              position: "relative",
            }}
          >
            <Text style={{ fontSize: 24 }}>🔔</Text>

            {hasUnreadNotifications && (
              <View
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 11,
                  height: 11,
                  borderRadius: 6,
                  backgroundColor: "#ef4444",
                  borderWidth: 2,
                  borderColor: "#fff",
                }}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Go Live / Offline */}
        <View style={styles.liveCard}>
          <View style={styles.liveInfo}>
            <View style={[styles.liveDot, !isLive && styles.offlineDot]} />

            <View>
              <Text style={styles.liveTitle}>
                {isLive ? "Salon is Live" : "Salon is Offline"}
              </Text>

              <Text style={styles.liveSubtitle}>
                {isLive
                  ? "Accepting online bookings"
                  : "Not accepting online bookings"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.liveButton, !isLive && styles.offlineButton]}
            activeOpacity={0.8}
            onPress={async () => {
              try {
                const mobile = await AsyncStorage.getItem("partnerMobile");

                if (!mobile) {
                  return;
                }

                setLoadingLive(true);

                const newStatus = !isLive;

                const response = await fetch(
                  `${API_URL}/api/salons/partner/${mobile}/live`,
                  {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      isLive: newStatus,
                    }),
                  },
                );

                const data = await response.json();

                if (response.ok) {
                  setIsLive(newStatus);
                } else {
                  console.log("Live Status Error:", data);
                }
              } catch (error) {
                console.error("Update Live Status Error:", error);
              } finally {
                setLoadingLive(false);
              }
            }}
          >
            <Text
              style={[
                styles.liveButtonText,
                !isLive && styles.offlineButtonText,
              ]}
            >
              {isLive ? "LIVE" : "GO LIVE"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Today's Overview */}
        <Text style={styles.sectionTitle}>Today's Overview</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.calendarIcon}>
              <Text style={styles.calendarMonth}>
                {new Date().toLocaleString("en-US", { month: "short" })}
              </Text>
              <Text style={styles.calendarDay}>{new Date().getDate()}</Text>
            </View>
            <Text style={styles.statValue}>{todayBookings}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⏳</Text>
            <Text style={styles.statValue}>{todayPending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>₹</Text>
            <Text style={styles.statValue}>₹{todayEarnings}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={() => router.push("/partner/services")}
          >
            <View style={styles.actionIcon}>
              <Text>✂️</Text>
            </View>

            <Text style={styles.actionTitle}>Services</Text>
            <Text style={styles.actionSubtitle}>Manage pricing</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={() => router.push("/(tabs)/staff")}
          >
            <View style={styles.actionIcon}>
              <Text>👥</Text>
            </View>

            <Text style={styles.actionTitle}>Staff</Text>
            <Text style={styles.actionSubtitle}>Manage staff</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={() => router.push("/partner/schedule")}
          >
            <View style={styles.actionIcon}>
              <Text>🗓️</Text>
            </View>

            <Text style={styles.actionTitle}>Schedule</Text>
            <Text style={styles.actionSubtitle}>Manage slots</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.8}
            onPress={() => router.push("/(tabs)/bookings")}
          >
            <View style={styles.actionIcon}>
              <Text>📋</Text>
            </View>

            <Text style={styles.actionTitle}>Bookings</Text>
            <Text style={styles.actionSubtitle}>View appointments</Text>
          </TouchableOpacity>
        </View>

        {/* Offers */}
        <TouchableOpacity
          style={styles.offerActionCard}
          activeOpacity={0.8}
          onPress={() => router.push("/partner/offers")}
        >
          <View style={styles.actionIcon}>
            <Text>🎁</Text>
          </View>

          <View style={styles.offerActionInfo}>
            <Text style={styles.offerActionTitle}>Offers</Text>
            <Text style={styles.offerActionSubtitle}>Manage offers</Text>
          </View>
        </TouchableOpacity>

        {/* Today's Appointments */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitleNoMargin}>Today's Appointments</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(tabs)/bookings")}
          >
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        {todayAppointments.length === 0 ? (
          <View style={styles.emptyAppointmentCard}>
            <Text style={styles.emptyAppointmentText}>
              No appointments for today
            </Text>
          </View>
        ) : (
          todayAppointments.map((appointment) => {
            const firstService = appointment.bookingServices?.[0]?.service;

            return (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentTime}>
                  <Text style={styles.time}>{appointment.time}</Text>
                </View>

                <View style={styles.appointmentInfo}>
                  <Text style={styles.customerName}>
                    {appointment.customer?.name || "Customer"}
                  </Text>

                  <Text style={styles.service}>
                    {firstService?.name || "Service"}
                  </Text>

                  <Text style={styles.staff}>
                    Staff: {appointment.staff?.name || "Not assigned"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.confirmedBadge,
                    appointment.status === "PENDING" && styles.pendingBadge,
                    appointment.status === "COMPLETED" && styles.completedBadge,
                    appointment.status === "CANCELLED" && styles.cancelledBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.confirmedText,
                      appointment.status === "PENDING" && styles.pendingText,
                      appointment.status === "COMPLETED" &&
                        styles.completedText,
                      appointment.status === "CANCELLED" &&
                        styles.cancelledText,
                    ]}
                  >
                    {appointment.status || "PENDING"}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        {/* Earnings */}
        <Text style={styles.sectionTitle}>Earnings</Text>

        <View style={styles.earningsCard}>
          <View>
            <Text style={styles.earningsLabel}>This Month</Text>
            <Text style={styles.earningsAmount}>₹{monthlyEarnings}</Text>
          </View>

          <View style={styles.earningsRight}>
            <Text style={styles.earningsSmall}>Completed</Text>
            <Text style={styles.earningsCount}>{monthlyServices} services</Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={locationModalVisible}
        animationType="slide"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: "#FFFFFF",
          }}
        >
          {/* HEADER */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 18,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: "#EEEEEE",
            }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setLocationModalVisible(false)}
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 32,
                  color: "#222",
                  lineHeight: 32,
                }}
              >
                ‹
              </Text>
            </TouchableOpacity>

            <Text
              style={{
                fontSize: 19,
                fontWeight: "800",
                color: "#191522",
                marginLeft: 8,
              }}
            >
              Confirm Location
            </Text>
          </View>

          {/* SEARCH */}
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 14,
              height: 48,
              borderWidth: 1,
              borderColor: "#E1E1E1",
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 14,
              backgroundColor: "#FFFFFF",
            }}
          >
            <Text
              style={{
                fontSize: 18,
                marginRight: 8,
              }}
            >
              🔍
            </Text>

            <TextInput
              value={locationSearch}
              onChangeText={handleLocationSearchChange}
              placeholder="Search location"
              placeholderTextColor="#999"
              returnKeyType="search"
              onSubmitEditing={searchLocationOnMap}
              style={{
                flex: 1,
                fontSize: 14,
                color: "#222",
              }}
            />

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={searchLocationOnMap}
              style={{
                width: 38,
                height: 38,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  color: "#5B3CC4",
                  fontWeight: "700",
                }}
              >
                🔍
              </Text>
            </TouchableOpacity>
          </View>

          {locationSuggestions.length > 0 && (
            <View
              style={{
                position: "absolute",
                top: 76,
                left: 16,
                right: 16,
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#E5E5E5",
                zIndex: 9999,
                elevation: 8,
                overflow: "hidden",
              }}
            >
              {locationSuggestions.map((item: any, index: number) => (
                <TouchableOpacity
                  key={item.placeId}
                  activeOpacity={0.7}
                  onPress={() => {
                    setLocationSearch(item.description);
                    setLocationSuggestions([]);

                    locationWebViewRef.current?.injectJavaScript(`
              if (window.selectLocation) {
                window.selectLocation(
                  ${JSON.stringify(item.placeId)}
                );
              }
              true;
            `);
                  }}
                  style={{
                    paddingHorizontal: 15,
                    paddingVertical: 13,
                    borderBottomWidth:
                      index === locationSuggestions.length - 1 ? 0 : 1,
                    borderBottomColor: "#EEEEEE",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#222",
                    }}
                    numberOfLines={1}
                  >
                    {item.mainText}
                  </Text>

                  {item.secondaryText ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#777",
                        marginTop: 3,
                      }}
                      numberOfLines={1}
                    >
                      {item.secondaryText}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* MAP */}
          <View
            style={{
              flex: 1,
              marginTop: 14,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {selectedLatitude !== null && selectedLongitude !== null ? (
              <WebView
                ref={locationWebViewRef}
                originWhitelist={["*"]}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                source={{
                  html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta
                  name="viewport"
                  content="width=device-width,
                  initial-scale=1.0,
                  maximum-scale=1.0,
                  user-scalable=no"
                />

                <style>
                  html,
                  body,
                  #map {
                    width: 100%;
                    height: 100%;
                    margin: 0;
                    padding: 0;
                  }
                </style>

                <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places"></script>
              </head>

              <body>
                <div id="map"></div>

                <script>
                  let map;
                  let marker;
                  let geocoder;

                  const initialLatitude = ${selectedLatitude};
                  const initialLongitude = ${selectedLongitude};

                  function initMap() {
                    const position = {
                      lat: initialLatitude,
                      lng: initialLongitude
                    };

                    map = new google.maps.Map(
                      document.getElementById("map"),
                      {
                        center: position,
                        zoom: 16,
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: false,
                        zoomControl: true
                      }
                    );

                    geocoder = new google.maps.Geocoder();

                    marker = new google.maps.Marker({
                      position: position,
                      map: map,
                      draggable: true,
                      title: "Selected Location"
                    });

                    marker.addListener("dragend", function() {
                      const position = marker.getPosition();

                      if (!position) return;

                      window.ReactNativeWebView.postMessage(
                        JSON.stringify({
                          type: "LOCATION_CHANGED",
                          latitude: position.lat(),
                          longitude: position.lng()
                        })
                      );
                    });

                    map.addListener("click", function(event) {
                      if (!event.latLng) return;

                      const latitude = event.latLng.lat();
                      const longitude = event.latLng.lng();

                      marker.setPosition({
                        lat: latitude,
                        lng: longitude
                      });

                      window.ReactNativeWebView.postMessage(
                        JSON.stringify({
                          type: "LOCATION_CHANGED",
                          latitude: latitude,
                          longitude: longitude
                        })
                      );
                    });
                  }

                  window.moveMarker = function(latitude, longitude) {
                    const position = {
                      lat: latitude,
                      lng: longitude
                    };

                    if (marker) {
                      marker.setPosition(position);
                    }

                    if (map) {
                      map.setCenter(position);
                      map.setZoom(16);
                    }
                  };

                  window.getLocationSuggestions = function(query) {
  if (!query || !window.google || !map) {
    return;
  }

  const service =
    new google.maps.places.AutocompleteService();

  service.getPlacePredictions(
    {
      input: query,
      componentRestrictions: {
        country: "in"
      }
    },
    function(predictions, status) {
      if (
        status ===
          google.maps.places.PlacesServiceStatus.OK &&
        predictions
      ) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "LOCATION_SUGGESTIONS",
            suggestions: predictions.map(function(item) {
              return {
                placeId: item.place_id,
                description: item.description,
                mainText:
                  item.structured_formatting?.main_text ||
                  item.description,
                secondaryText:
                  item.structured_formatting?.secondary_text ||
                  ""
              };
            })
          })
        );
      } else {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "LOCATION_SUGGESTIONS",
            suggestions: []
          })
        );
      }
    }
  );
};

window.selectLocation = function(placeId) {
  if (!placeId || !map) {
    return;
  }

  const service =
    new google.maps.places.PlacesService(map);

  service.getDetails(
    {
      placeId: placeId,
      fields: [
        "geometry",
        "formatted_address",
        "name"
      ]
    },
    function(place, status) {
      if (
        status !==
          google.maps.places.PlacesServiceStatus.OK ||
        !place ||
        !place.geometry ||
        !place.geometry.location
      ) {
        return;
      }

      const latitude =
        place.geometry.location.lat();

      const longitude =
        place.geometry.location.lng();

      const position = {
        lat: latitude,
        lng: longitude
      };

      marker.setPosition(position);
      map.setCenter(position);
      map.setZoom(16);

      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "LOCATION_SELECTED",
          latitude: latitude,
          longitude: longitude,
          address:
            place.formatted_address ||
            place.name ||
            ""
        })
      );
    }
  );
};

                  window.searchLocation = function(query) {
                    if (!query || !window.google) return;

                    const service =
                      new google.maps.places.PlacesService(map);

                    service.findPlaceFromQuery(
                      {
                        query: query,
                        fields: [
                          "name",
                          "geometry",
                          "formatted_address"
                        ]
                      },
                      function(results, status) {
                        if (
                          status ===
                            google.maps.places.PlacesServiceStatus.OK &&
                          results &&
                          results.length > 0
                        ) {
                          const place = results[0];

                          if (
                            !place.geometry ||
                            !place.geometry.location
                          ) {
                            return;
                          }

                          const latitude =
                            place.geometry.location.lat();

                          const longitude =
                            place.geometry.location.lng();

                          const position = {
                            lat: latitude,
                            lng: longitude
                          };

                          marker.setPosition(position);
                          map.setCenter(position);
                          map.setZoom(16);

                          window.ReactNativeWebView.postMessage(
                            JSON.stringify({
                              type: "LOCATION_CHANGED",
                              latitude: latitude,
                              longitude: longitude
                            })
                          );
                        }
                      }
                    );
                  };

                  window.onload = initMap;
                </script>
              </body>
              </html>
            `,
                }}
                onMessage={async (event) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);

                    if (data?.type === "LOCATION_SUGGESTIONS") {
                      setLocationSuggestions(
                        Array.isArray(data.suggestions) ? data.suggestions : [],
                      );

                      return;
                    }

                    if (data?.type === "LOCATION_SELECTED") {
                      const latitude = Number(data.latitude);
                      const longitude = Number(data.longitude);

                      if (
                        !Number.isFinite(latitude) ||
                        !Number.isFinite(longitude)
                      ) {
                        return;
                      }

                      setSelectedLatitude(latitude);
                      setSelectedLongitude(longitude);

                      setLocationSuggestions([]);
                      setLocationSearch(data.address || "");

                      await reverseGeocodeLocation(latitude, longitude);

                      return;
                    }

                    if (data?.type === "LOCATION_CHANGED") {
                      const latitude = Number(data.latitude);
                      const longitude = Number(data.longitude);

                      if (
                        !Number.isFinite(latitude) ||
                        !Number.isFinite(longitude)
                      ) {
                        return;
                      }

                      setSelectedLatitude(latitude);
                      setSelectedLongitude(longitude);

                      setLocationSuggestions([]);

                      await reverseGeocodeLocation(latitude, longitude);
                    }
                  } catch (error) {
                    console.error("Map Message Error:", error);
                  }
                }}
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActivityIndicator size="large" color="#5B3CC4" />

                <Text
                  style={{
                    marginTop: 10,
                    color: "#777",
                  }}
                >
                  Detecting your location...
                </Text>
              </View>
            )}

            {/* CURRENT LOCATION BUTTON */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={getCurrentLocationForModal}
              style={{
                position: "absolute",
                right: 16,
                bottom: 18,
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
                elevation: 5,
                shadowColor: "#000",
                shadowOpacity: 0.18,
                shadowRadius: 5,
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
              }}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color="#5B3CC4" />
              ) : (
                <Text
                  style={{
                    fontSize: 24,
                    color: "#5B3CC4",
                  }}
                >
                  ◎
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ADDRESS */}
          <View
            style={{
              paddingHorizontal: 18,
              paddingTop: 14,
              paddingBottom: 10,
            }}
          >
            {locationLoading ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <ActivityIndicator size="small" color="#5B3CC4" />

                <Text
                  style={{
                    marginLeft: 8,
                    fontSize: 13,
                    color: "#777",
                  }}
                >
                  Updating address...
                </Text>
              </View>
            ) : (
              <Text
                numberOfLines={3}
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color: "#333",
                  fontWeight: "500",
                }}
              >
                📍{" "}
                {selectedAddress || "Move the marker to select your location"}
              </Text>
            )}

            {locationError ? (
              <Text
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "#D64545",
                }}
              >
                {locationError}
              </Text>
            ) : null}
          </View>

          {/* CONFIRM */}
          <View
            style={{
              paddingHorizontal: 18,
              paddingBottom: 15,
              paddingTop: 5,
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={
                selectedLatitude === null ||
                selectedLongitude === null ||
                !selectedAddress ||
                locationLoading
              }
              onPress={async () => {
                if (
                  selectedLatitude === null ||
                  selectedLongitude === null ||
                  !selectedAddress
                ) {
                  return;
                }

                try {
                  setLocationLoading(true);
                  setLocationError("");

                  const mobile = await AsyncStorage.getItem("partnerMobile");

                  if (!mobile) {
                    setLocationError("Partner mobile not found.");
                    return;
                  }

                  const response = await fetch(
                    `${API_URL}/api/salons/partner/${mobile}/location`,
                    {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        address: selectedAddress,
                        city: selectedCity,
                        state: selectedState,
                        pincode: selectedPincode,
                        latitude: selectedLatitude,
                        longitude: selectedLongitude,
                      }),
                    },
                  );

                  const data = await response.json();

                  if (!response.ok) {
                    console.error("Location Update Error:", data);

                    setLocationError(
                      data?.message || "Unable to update location.",
                    );

                    return;
                  }

                  // Save locally
                  await AsyncStorage.setItem(
                    "partnerLocation",
                    JSON.stringify({
                      latitude: selectedLatitude,
                      longitude: selectedLongitude,
                      address: selectedAddress,
                    }),
                  );

                  // Update Home immediately
                  setSelectedAddress(selectedAddress);
                  setSelectedLatitude(selectedLatitude);
                  setSelectedLongitude(selectedLongitude);

                  setLocationModalVisible(false);

                  console.log("Location Updated Successfully:", data.salon);
                } catch (error) {
                  console.error("Confirm Location Error:", error);

                  setLocationError(
                    "Unable to connect to server. Please try again.",
                  );
                } finally {
                  setLocationLoading(false);
                }
              }}
              style={{
                backgroundColor:
                  selectedLatitude !== null &&
                  selectedLongitude !== null &&
                  selectedAddress &&
                  !locationLoading
                    ? "#5B3CC4"
                    : "#CFCFCF",
                paddingVertical: 15,
                borderRadius: 14,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 15,
                  fontWeight: "800",
                }}
              >
                Confirm Location
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7FC",
  },

  content: {
    paddingBottom: 35,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  greeting: {
    fontSize: 13,
    color: "#777",
  },

  salonName: {
    fontSize: 25,
    fontWeight: "800",
    color: "#191522",
    marginTop: 3,
  },

  profileButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E9D9FF",
    alignItems: "center",
    justifyContent: "center",
  },

  profileText: {
    fontSize: 19,
    fontWeight: "800",
    color: "#7B2CBF",
  },

  liveCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E8E1F5",
  },

  liveInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  liveDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#2E8B57",
    marginRight: 10,
  },

  offlineDot: {
    backgroundColor: "#D64545",
  },

  liveTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#191522",
  },

  liveSubtitle: {
    fontSize: 11,
    color: "#777",
    marginTop: 3,
  },

  liveButton: {
    backgroundColor: "#E8F7ED",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 15,
  },

  offlineButton: {
    backgroundColor: "#FDECEC",
  },

  liveButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2E8B57",
  },

  offlineButtonText: {
    color: "#D64545",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#191522",
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },

  sectionTitleNoMargin: {
    fontSize: 18,
    fontWeight: "800",
    color: "#191522",
  },

  statsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    gap: 10,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },

  statIcon: {
    fontSize: 18,
    marginBottom: 7,
  },

  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#5B3CC4",
  },

  statLabel: {
    fontSize: 10,
    color: "#777",
    marginTop: 3,
  },

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 20,
    gap: 10,
  },

  actionCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    alignItems: "center",
  },

  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#F0EBFF",
    alignItems: "center",
    justifyContent: "center",
  },

  offerActionCard: {
    width: "48%",
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    alignItems: "center",
    alignSelf: "center",
  },

  offerActionInfo: {
    alignItems: "center",
  },

  offerActionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#25202F",
    marginTop: 10,
    textAlign: "center",
  },

  offerActionSubtitle: {
    fontSize: 11,
    color: "#888",
    marginTop: 3,
    textAlign: "center",
  },

  actionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#25202F",
    marginTop: 10,
    textAlign: "center",
  },

  actionSubtitle: {
    fontSize: 11,
    color: "#888",
    marginTop: 3,
    textAlign: "center",
  },

  sectionHeader: {
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  viewAll: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5B3CC4",
  },

  appointmentCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  appointmentTime: {
    width: 55,
    alignItems: "center",
  },

  time: {
    fontSize: 15,
    fontWeight: "800",
    color: "#191522",
  },

  am: {
    fontSize: 10,
    color: "#777",
    marginTop: 2,
  },

  appointmentInfo: {
    flex: 1,
    marginLeft: 12,
  },

  customerName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#25202F",
  },

  service: {
    fontSize: 12,
    color: "#666",
    marginTop: 3,
  },

  staff: {
    fontSize: 10,
    color: "#999",
    marginTop: 3,
  },

  confirmedBadge: {
    backgroundColor: "#E8F7ED",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
  },

  confirmedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2E8B57",
  },

  pendingBadge: {
    backgroundColor: "#FFF4D8",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
  },

  pendingText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B07A00",
  },

  earningsCard: {
    marginHorizontal: 20,
    backgroundColor: "#5B3CC4",
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  earningsLabel: {
    fontSize: 11,
    color: "#DDD3F7",
  },

  earningsAmount: {
    fontSize: 25,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 4,
  },

  earningsRight: {
    alignItems: "flex-end",
  },

  earningsSmall: {
    fontSize: 11,
    color: "#DDD3F7",
  },

  earningsCount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 4,
  },

  calendarIcon: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDDDDD",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 7,
  },

  calendarMonth: {
    width: "100%",
    textAlign: "center",
    backgroundColor: "#D9534F",
    color: "#FFFFFF",
    fontSize: 7,
    fontWeight: "700",
    paddingVertical: 1,
  },

  calendarDay: {
    fontSize: 12,
    fontWeight: "800",
    color: "#222222",
    marginTop: 1,
  },
  emptyAppointmentCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 25,
    alignItems: "center",
  },

  emptyAppointmentText: {
    fontSize: 13,
    color: "#777",
  },

  completedBadge: {
    backgroundColor: "#E8F7ED",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
  },

  completedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2E8B57",
  },

  cancelledBadge: {
    backgroundColor: "#FDECEC",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
  },

  cancelledText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D64545",
  },
});
