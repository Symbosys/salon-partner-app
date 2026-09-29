import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const formatBookingDate = (value?: string) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function BookingDetailsScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [status, setStatus] = useState("Pending");
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadBooking = async () => {
    try {
      if (!bookingId) return;

      const response = await fetch(
        `${API_URL}/api/bookings/by-booking-id/${bookingId}`,
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.message || "Booking not found.");
        return;
      }

      setBooking(data);
      setStatus(
        data.status === "ACCEPTED"
          ? "Confirmed"
          : data.status === "ARRIVED"
            ? "Customer Arrived"
            : data.status === "STARTED"
              ? "Service Started"
              : data.status === "COMPLETED"
                ? "Completed"
                : data.status === "CANCELLED"
                  ? "Rejected"
                  : "Pending",
      );
    } catch (error) {
      console.error("Load Booking Error:", error);
      Alert.alert("Error", "Unable to load booking details.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBooking();

      const interval = setInterval(() => {
        loadBooking();
      }, 5000);

      return () => clearInterval(interval);
    }, [bookingId]),
  );

  const handleAccept = async () => {
    try {
      const mobile = await AsyncStorage.getItem("partnerMobile");

      if (!mobile || !bookingId) {
        Alert.alert("Error", "Booking information not found.");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/bookings/partner/${mobile}/${bookingId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "ACCEPTED",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.message || "Unable to accept booking.");
        return;
      }

      setStatus("Confirmed");
      setBooking(data.booking);

      Alert.alert("Success", "Booking confirmed successfully.");
    } catch (error) {
      console.error("Accept Booking Error:", error);
      Alert.alert("Error", "Unable to confirm booking.");
    }
  };

  const verifyCustomerQR = async (qrCode: string) => {
    try {
      const mobile = await AsyncStorage.getItem("partnerMobile");

      if (!mobile || !bookingId) {
        Alert.alert("Error", "Booking information not found.");
        setScanned(false);
        return;
      }

      const response = await fetch(
        `${API_URL}/api/bookings/partner/${mobile}/verify-qr`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            qrCode,
          }),
        },
      );

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        console.error(
          "QR API returned non-JSON response:",
          await response.text(),
        );

        Alert.alert(
          "Error",
          "Server returned an invalid response. Please check the backend.",
        );

        setScanned(false);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "QR Verification Failed",
          data.message || "Invalid customer QR code.",
        );

        setScanned(false);
        return;
      }

      setStatus("Completed");
      setBooking(data.booking);

      Alert.alert(
        "Booking Completed",
        "Customer QR verified successfully. Appointment is completed.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      console.error("Verify Customer QR Error:", error);

      Alert.alert("Error", "Unable to verify QR code. Please try again.");

      setScanned(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {showScanner && (
        <View style={styles.scannerOverlay}>
          {/* Camera */}
          <CameraView
            style={styles.scanner}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            onBarcodeScanned={
              scanned
                ? undefined
                : ({ data }) => {
                    setScanned(true);
                    setShowScanner(false);
                    verifyCustomerQR(data);
                  }
            }
          />

          {/* Dark overlay */}
          <View style={styles.scannerDarkOverlay} />

          {/* Top Header */}
          <SafeAreaView style={styles.scannerHeader}>
            <TouchableOpacity
              style={styles.scannerBackButton}
              activeOpacity={0.8}
              onPress={() => setShowScanner(false)}
            >
              <Text style={styles.scannerBackText}>‹</Text>
            </TouchableOpacity>

            <View style={styles.scannerHeaderText}>
              <Text style={styles.scannerTitle}>Scan Customer QR</Text>

              <Text style={styles.scannerSubtitle}>
                Verify customer's appointment
              </Text>
            </View>
          </SafeAreaView>

          {/* Center Scanner Area */}
          <View style={styles.scannerCenter}>
            <Text style={styles.scannerInstruction}>
              Place the QR code inside the frame
            </Text>

            <View style={styles.qrFrame}>
              {/* Top Left */}
              <View style={[styles.corner, styles.cornerTopLeft]} />

              {/* Top Right */}
              <View style={[styles.corner, styles.cornerTopRight]} />

              {/* Bottom Left */}
              <View style={[styles.corner, styles.cornerBottomLeft]} />

              {/* Bottom Right */}
              <View style={[styles.corner, styles.cornerBottomRight]} />

              {/* Scan Line */}
              {!scanned && <View style={styles.scanLine} />}
            </View>

            <Text style={styles.scannerHint}>Keep the QR code steady</Text>
          </View>

          {/* Bottom */}
          <View style={styles.scannerBottom}>
            <View style={styles.scanInfoCard}>
              <Text style={styles.scanInfoIcon}>▣</Text>

              <View style={{ flex: 1 }}>
                <Text style={styles.scanInfoTitle}>
                  Scan to complete appointment
                </Text>

                <Text style={styles.scanInfoText}>
                  Scan the QR code shown by the customer
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeScannerButton}
              activeOpacity={0.85}
              onPress={() => setShowScanner(false)}
            >
              <Text style={styles.closeScannerText}>Close Scanner</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.title}>Manage Appointment</Text>
            <Text style={styles.subtitle}>Booking details</Text>
          </View>
        </View>

        {/* Status */}
        <View style={styles.statusCard}>
          <View>
            <Text style={styles.statusLabel}>Booking Status</Text>
            <Text style={styles.statusValue}>{status}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              status === "Confirmed"
                ? styles.confirmedBadge
                : status === "Customer Arrived"
                  ? styles.arrivedBadge
                  : status === "Service Started"
                    ? styles.startedBadge
                    : status === "Completed"
                      ? styles.completedBadge
                      : status === "Rejected"
                        ? styles.rejectedBadge
                        : styles.pendingBadge,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                status === "Confirmed"
                  ? styles.confirmedText
                  : status === "Customer Arrived"
                    ? styles.arrivedText
                    : status === "Service Started"
                      ? styles.startedText
                      : status === "Completed"
                        ? styles.completedText
                        : status === "Rejected"
                          ? styles.rejectedText
                          : styles.pendingText,
              ]}
            >
              {status}
            </Text>
          </View>
        </View>

        {/* Booking Information */}
        <Text style={styles.sectionTitle}>Booking Information</Text>

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Booking ID</Text>
            <Text style={styles.value}>{booking?.bookingId || "-"}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{formatBookingDate(booking?.date)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Time</Text>
            <Text style={styles.value}>{booking?.time || "-"}</Text>
          </View>
        </View>

        {/* Customer Details */}
        <Text style={styles.sectionTitle}>Customer Details</Text>

        <View style={styles.card}>
          <Text style={styles.customerName}>
            {booking?.customer?.name || booking?.customerName || "-"}
          </Text>
          <Text style={styles.customerPhone}>
            {booking?.customer?.mobile || booking?.customerMobile || "-"}
          </Text>
        </View>

        {/* Service Details */}
        <Text style={styles.sectionTitle}>Service Details</Text>

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Service</Text>
            <Text style={styles.value}>
              {booking?.bookingServices?.[0]?.service?.name || "-"}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Staff</Text>
            <Text style={styles.value}>
              {booking?.staff?.name || "Any Staff"}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Duration</Text>
            <Text style={styles.value}>
              {booking?.bookingServices?.[0]?.service?.duration
                ? `${booking.bookingServices[0].service.duration} min`
                : "-"}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Amount</Text>
            <Text style={styles.amount}>
              ₹{booking?.totalAmount || booking?.amount || "0"}
            </Text>
          </View>
        </View>

        {/* Actions */}

        {/* Pending */}
        {status === "Pending" ? (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => {
                Alert.alert(
                  "Reject Booking",
                  "Are you sure you want to reject this booking?",
                  [
                    {
                      text: "Cancel",
                      style: "cancel",
                    },
                    {
                      text: "OK",
                      onPress: async () => {
                        try {
                          const mobile =
                            await AsyncStorage.getItem("partnerMobile");

                          if (!mobile || !bookingId) {
                            Alert.alert(
                              "Error",
                              "Booking information not found.",
                            );
                            return;
                          }

                          const response = await fetch(
                            `${API_URL}/api/bookings/partner/${mobile}/${bookingId}/status`,
                            {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                status: "CANCELLED",
                              }),
                            },
                          );

                          const data = await response.json();

                          if (!response.ok) {
                            Alert.alert(
                              "Error",
                              data.message || "Unable to reject booking.",
                            );
                            return;
                          }

                          setStatus("Rejected");
                          setBooking(data.booking);

                          Alert.alert(
                            "Success",
                            "Booking rejected successfully.",
                          );
                        } catch (error) {
                          console.error("Reject Booking Error:", error);
                          Alert.alert("Error", "Unable to reject booking.");
                        }
                      },
                    },
                  ],
                );
              }}
            >
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAccept}
            >
              <Text style={styles.acceptText}>Accept Booking</Text>
            </TouchableOpacity>
          </View>
        ) : status === "Confirmed" ? (
          /* Confirmed */
          <View style={styles.confirmedCard}>
            <Text style={styles.confirmedTitle}>Appointment Confirmed</Text>

            <Text style={styles.confirmedDescription}>
              Customer appointment has been confirmed.
            </Text>

            <TouchableOpacity
              style={styles.manageButton}
              onPress={async () => {
                try {
                  const mobile = await AsyncStorage.getItem("partnerMobile");

                  if (!mobile || !bookingId) {
                    Alert.alert("Error", "Booking information not found.");
                    return;
                  }

                  const response = await fetch(
                    `${API_URL}/api/bookings/partner/${mobile}/${bookingId}/status`,
                    {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        status: "ARRIVED",
                      }),
                    },
                  );

                  const data = await response.json();

                  if (!response.ok) {
                    Alert.alert(
                      "Error",
                      data.message || "Unable to update booking status.",
                    );
                    return;
                  }

                  setStatus("Customer Arrived");
                  setBooking(data.booking);
                } catch (error) {
                  console.error("Customer Arrived Error:", error);
                  Alert.alert("Error", "Unable to update booking status.");
                }
              }}
            >
              <Text style={styles.manageText}>Customer Arrived</Text>
            </TouchableOpacity>
          </View>
        ) : status === "Rejected" ? (
          /* Rejected */
          <View style={styles.rejectedCard}>
            <Text style={styles.rejectedTitle}>Booking Rejected</Text>

            <Text style={styles.rejectedDescription}>
              This appointment has been rejected.
            </Text>
          </View>
        ) : status === "Customer Arrived" ? (
          /* Customer Arrived */
          <View style={styles.arrivedCard}>
            <Text style={styles.arrivedTitle}>Customer Arrived</Text>

            <Text style={styles.arrivedDescription}>
              Customer has arrived for the appointment.
            </Text>

            <TouchableOpacity
              style={styles.startServiceButton}
              onPress={async () => {
                try {
                  const mobile = await AsyncStorage.getItem("partnerMobile");

                  if (!mobile || !bookingId) {
                    Alert.alert("Error", "Booking information not found.");
                    return;
                  }

                  const response = await fetch(
                    `${API_URL}/api/bookings/partner/${mobile}/${bookingId}/status`,
                    {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        status: "STARTED",
                      }),
                    },
                  );

                  const data = await response.json();

                  if (!response.ok) {
                    Alert.alert(
                      "Error",
                      data.message || "Unable to start service.",
                    );
                    return;
                  }

                  setStatus("Service Started");
                  setBooking(data.booking);
                } catch (error) {
                  console.error("Start Service Error:", error);
                  Alert.alert("Error", "Unable to start service.");
                }
              }}
            >
              <Text style={styles.startServiceText}>Start Service</Text>
            </TouchableOpacity>
          </View>
        ) : status === "Service Started" ? (
          /* Service Started */
          <View style={styles.startedCard}>
            <Text style={styles.startedTitle}>Service Started</Text>

            <Text style={styles.startedDescription}>
              The service is currently in progress.
            </Text>

            <TouchableOpacity
              style={styles.completeServiceButton}
              onPress={async () => {
                if (!permission?.granted) {
                  await requestPermission();
                }

                setScanned(false);
                setShowScanner(true);
              }}
            >
              <Text style={styles.completeServiceText}>Scan Customer QR</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Completed */
          <View style={styles.completedCard}>
            <Text style={styles.completedTitle}>Service Completed</Text>

            <Text style={styles.completedDescription}>
              The customer's service has been completed successfully.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  backText: {
    fontSize: 30,
    color: "#111827",
    marginTop: -3,
  },

  title: {
    fontSize: 23,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 3,
  },

  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  statusLabel: {
    fontSize: 12,
    color: "#6B7280",
  },

  statusValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 4,
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },

  pendingBadge: {
    backgroundColor: "#FFF4D8",
  },

  confirmedBadge: {
    backgroundColor: "#E8F7ED",
  },

  arrivedBadge: {
    backgroundColor: "#E8F7ED",
  },

  startedBadge: {
    backgroundColor: "#FFF4D8",
  },

  completedBadge: {
    backgroundColor: "#E8F7ED",
  },

  rejectedBadge: {
    backgroundColor: "#FEF2F2",
  },

  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },

  pendingText: {
    color: "#B07A00",
  },

  confirmedText: {
    color: "#15803D",
  },

  arrivedText: {
    color: "#15803D",
  },

  startedText: {
    color: "#B07A00",
  },

  completedText: {
    color: "#15803D",
  },

  rejectedText: {
    color: "#DC2626",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 22,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 28,
  },

  label: {
    fontSize: 14,
    color: "#6B7280",
  },

  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  amount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },

  customerName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  customerPhone: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 6,
  },

  actionContainer: {
    flexDirection: "row",
    gap: 10,
  },

  rejectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DC2626",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },

  rejectText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "600",
  },

  acceptButton: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },

  acceptText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  confirmedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
  },

  confirmedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#15803D",
  },

  confirmedDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 5,
    marginBottom: 15,
  },

  manageButton: {
    backgroundColor: "#111827",
    borderRadius: 11,
    paddingVertical: 14,
    alignItems: "center",
  },

  manageText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  rejectedCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 16,
  },

  rejectedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#DC2626",
  },

  rejectedDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 5,
  },

  arrivedCard: {
    backgroundColor: "#E8F7ED",
    borderRadius: 14,
    padding: 16,
  },

  arrivedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#15803D",
  },

  arrivedDescription: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 5,
  },

  startServiceButton: {
    backgroundColor: "#111827",
    borderRadius: 11,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 15,
  },

  startServiceText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  startedCard: {
    backgroundColor: "#FFF4D8",
    borderRadius: 14,
    padding: 16,
  },

  startedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#B07A00",
  },

  startedDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 5,
    marginBottom: 15,
  },

  completeServiceButton: {
    backgroundColor: "#111827",
    borderRadius: 11,
    paddingVertical: 14,
    alignItems: "center",
  },

  completeServiceText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  completedCard: {
    backgroundColor: "#E8F7ED",
    borderRadius: 14,
    padding: 16,
  },

  completedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#15803D",
  },

  completedDescription: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 5,
  },
  scannerOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#000000",
    zIndex: 100,
  },

  scanner: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },

  scannerDarkOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
  },

  scannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  scannerBackButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },

  scannerBackText: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 38,
    marginTop: -4,
  },

  scannerHeaderText: {
    marginLeft: 14,
  },

  scannerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },

  scannerSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 3,
  },

  scannerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -40,
  },

  scannerInstruction: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 22,
    textAlign: "center",
  },

  qrFrame: {
    width: 245,
    height: 245,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },

  corner: {
    position: "absolute",
    width: 38,
    height: 38,
    borderColor: "#FFFFFF",
  },

  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },

  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },

  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },

  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },

  scanLine: {
    position: "absolute",
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: "#FFFFFF",
    top: "50%",
    opacity: 0.9,
  },

  scannerHint: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 20,
  },

  scannerBottom: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },

  scanInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },

  scanInfoIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.18)",
    color: "#FFFFFF",
    fontSize: 22,
    textAlign: "center",
    lineHeight: 42,
    marginRight: 12,
  },

  scanInfoTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  scanInfoText: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 11,
    marginTop: 3,
  },

  closeScannerButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  closeScannerText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
});
