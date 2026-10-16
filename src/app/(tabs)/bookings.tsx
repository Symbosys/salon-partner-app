import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
export default function PartnerBookingsScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [selectedTab, setSelectedTab] = useState("Confirmed");
  useEffect(() => {
    const requestedTab = Array.isArray(tab) ? tab[0] : tab;
    if (requestedTab?.toLowerCase() === "rejected") {
      setSelectedTab("Rejected");
    }
  }, [tab]);
  const [bookings, setBookings] = useState<any[]>([]);
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const [selectedDate, setSelectedDate] = useState(
    getLocalDateString(new Date()),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const loadBookings = async () => {
    try {
      const mobile = await AsyncStorage.getItem("partnerMobile");
      if (!mobile) return;
      const date = selectedDate;
      console.log("Selected Booking Date:", date);
      console.log(
        "Bookings API URL:",
        `${API_URL}/api/bookings/partner/${mobile}/today-appointments?date=${date}`,
      );
      const response = await fetch(
        `${API_URL}/api/bookings/partner/${mobile}/today-appointments?date=${date}`,
      );
      const responseText = await response.text();
      console.log("Bookings API Status:", response.status);
      console.log("Bookings API Response:", responseText);
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        console.log("Bookings API returned non-JSON response:", responseText);
        return;
      }
      if (response.ok && Array.isArray(data)) {
        setBookings(data);
      } else {
        console.log("Bookings Error:", data);
        setBookings([]);
      }
    } catch (error) {
      console.error("Load Partner Bookings Error:", error);
    }
  };
  const handleCancelBooking = (bookingId: string) => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this appointment?",
      [
        {
          text: "Keep Booking",
          style: "cancel",
        },
        {
          text: "Cancel Booking",
          style: "destructive",
          onPress: async () => {
            try {
              const mobile = await AsyncStorage.getItem("partnerMobile");
              if (!mobile) {
                Alert.alert("Error", "Partner information not found.");
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
                    reason: "SALON_CANCELLED",
                  }),
                },
              );
              const data = await response.json();
              if (!response.ok) {
                Alert.alert(
                  "Error",
                  data.message || "Unable to cancel booking.",
                );
                return;
              }
              Alert.alert(
                "Booking Cancelled",
                "The appointment has been cancelled by the salon.",
              );
              await loadBookings();
            } catch (error) {
              console.error("Cancel Booking Error:", error);
              Alert.alert("Error", "Unable to cancel booking.");
            }
          },
        },
      ],
    );
  };
  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [selectedDate]),
  );
  useEffect(() => {
    const interval = setInterval(() => {
      loadBookings();
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedDate]);
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Bookings</Text>
          <Text style={styles.subtitle}>Manage your salon appointments</Text>
        </View>
        <View style={styles.dateFilterContainer}>
          <View style={styles.dateFilterHeader}>
            <View style={styles.dateFilterIcon}>
              <View style={styles.calendarIcon}>
                <View style={styles.calendarTop}>
                  <View style={styles.calendarRing} />
                  <View style={styles.calendarRing} />
                </View>
                <View style={styles.calendarBody}>
                  <View style={styles.calendarLine} />
                  <View style={styles.calendarDots}>
                    <View style={styles.calendarDot} />
                    <View style={styles.calendarDot} />
                    <View style={styles.calendarDot} />
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.dateFilterLabelBox}>
              <Text style={styles.dateFilterLabel}>Appointments by Date</Text>
              <Text style={styles.dateFilterHint}>
                View bookings scheduled for a specific date
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.dateFilterButton}
            activeOpacity={0.8}
            onPress={() => setShowDatePicker(true)}
          >
            <View>
              <Text style={styles.selectedDateLabel}>Selected Date</Text>
              <Text style={styles.dateFilterText}>
                {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  },
                )}
              </Text>
            </View>
            <View style={styles.calendarArrow}>
              <Text style={styles.calendarArrowText}>›</Text>
            </View>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={new Date(`${selectedDate}T12:00:00`)}
              mode="date"
              display="default"
              onValueChange={(event, date) => {
                if (date) {
                  const formattedDate = getLocalDateString(date);
                  setSelectedDate(formattedDate);
                }
                setShowDatePicker(false);
              }}
              onDismiss={() => {
                setShowDatePicker(false);
              }}
            />
          )}
        </View>
        <View style={styles.tabs}>
          {["Confirmed", "Completed", "Rejected"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.activeTab]}
              activeOpacity={0.8}
              onPress={() => setSelectedTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tab && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {selectedTab === "Confirmed" && (
          <>
            {bookings.filter((booking) =>
              ["CONFIRMED", "ACCEPTED", "ARRIVED", "STARTED"].includes(
                booking.status?.toUpperCase(),
              ),
            ).length === 0 ? (
              <View style={styles.emptyBookingCard}>
                <Text style={styles.emptyBookingText}>
                  No confirmed bookings
                </Text>
              </View>
            ) : (
              bookings
                .filter((booking) =>
                  ["CONFIRMED", "ACCEPTED", "ARRIVED", "STARTED"].includes(
                    booking.status?.toUpperCase(),
                  ),
                )
                .map((booking) => {
                  const firstService = booking.bookingServices?.[0]?.service;
                  return (
                    <View key={booking.id} style={styles.bookingCard}>
                      <View style={styles.cardHeader}>
                        <View>
                          <Text style={styles.customerName}>
                            {booking.customer?.name || "Customer"}
                          </Text>
                          <Text style={styles.bookingId}>
                            Booking ID: {booking.bookingId}
                          </Text>
                        </View>
                        <View style={styles.confirmedBadge}>
                          <Text style={styles.confirmedText}>Confirmed</Text>
                        </View>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Service</Text>
                        <Text style={styles.detailValue}>
                          {firstService?.name || "Service"}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={styles.detailValue}>
                          {new Date(booking.date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Time</Text>
                        <Text style={styles.detailValue}>{booking.time}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Staff</Text>
                        <Text style={styles.detailValue}>
                          {booking.staff?.name || "Not assigned"}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Amount</Text>
                        <Text style={styles.amount}>
                          ₹
                          {Number(booking.amount || 0) -
                            Number(booking.discount || 0)}
                        </Text>
                      </View>
                      <View
                        style={{ flexDirection: "row", gap: 10, marginTop: 6 }}
                      >
                        {booking.status?.toUpperCase() === "CONFIRMED" && (
                          <TouchableOpacity
                            style={[
                              styles.manageButton,
                              {
                                flex: 1,
                                marginTop: 0,
                                backgroundColor: "#DC2626",
                              },
                            ]}
                            activeOpacity={0.8}
                            onPress={() =>
                              handleCancelBooking(booking.bookingId)
                            }
                          >
                            <Text style={styles.manageText}>
                              Cancel Booking
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[
                            styles.manageButton,
                            { flex: 1, marginTop: 0 },
                          ]}
                          activeOpacity={0.8}
                          onPress={() =>
                            router.push({
                              pathname: "/partner/booking-details",
                              params: {
                                bookingId: booking.bookingId,
                              },
                            })
                          }
                        >
                          <Text style={styles.manageText}>
                            Manage Appointment
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
            )}
          </>
        )}
        {selectedTab === "Completed" && (
          <>
            {bookings.filter((booking) => booking.status === "COMPLETED")
              .length === 0 ? (
              <View style={styles.emptyBookingCard}>
                <Text style={styles.emptyBookingText}>
                  No completed bookings
                </Text>
              </View>
            ) : (
              bookings
                .filter((booking) => booking.status === "COMPLETED")
                .map((booking) => {
                  const firstService = booking.bookingServices?.[0]?.service;
                  return (
                    <View key={booking.id} style={styles.bookingCard}>
                      <View style={styles.cardHeader}>
                        <View>
                          <Text style={styles.customerName}>
                            {booking.customer?.name || "Customer"}
                          </Text>
                          <Text style={styles.bookingId}>
                            Booking ID: {booking.bookingId}
                          </Text>
                        </View>
                        <View style={styles.completedBadge}>
                          <Text style={styles.completedText}>Completed</Text>
                        </View>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Service</Text>
                        <Text style={styles.detailValue}>
                          {firstService?.name || "Service"}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={styles.detailValue}>
                          {new Date(booking.date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Time</Text>
                        <Text style={styles.detailValue}>{booking.time}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Staff</Text>
                        <Text style={styles.detailValue}>
                          {booking.staff?.name || "Not assigned"}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Amount</Text>
                        <Text style={styles.amount}>
                          ₹
                          {Number(booking.amount || 0) -
                            Number(booking.discount || 0)}
                        </Text>
                      </View>
                    </View>
                  );
                })
            )}
          </>
        )}
        {selectedTab === "Rejected" && (
          <>
            {bookings.filter((booking) => booking.status === "CANCELLED")
              .length === 0 ? (
              <View style={styles.emptyBookingCard}>
                <Text style={styles.emptyBookingText}>
                  No rejected bookings
                </Text>
              </View>
            ) : (
              bookings
                .filter((booking) => booking.status === "CANCELLED")
                .map((booking) => {
                  const firstService = booking.bookingServices?.[0]?.service;
                  return (
                    <View key={booking.id} style={styles.bookingCard}>
                      <View style={styles.cardHeader}>
                        <View>
                          <Text style={styles.customerName}>
                            {booking.customer?.name || "Customer"}
                          </Text>
                          <Text style={styles.bookingId}>
                            Booking ID: {booking.bookingId}
                          </Text>
                        </View>
                        <View style={styles.rejectedBadge}>
                          <Text style={styles.rejectedText}>
                            {booking.cancelReason === "NOT_ARRIVED"
                              ? "Not Arrived"
                              : booking.cancelReason === "SALON_CANCELLED"
                                ? "Cancelled by Salon"
                                : booking.cancelReason === "Admin cancelled"
                                  ? "Rejected by Admin"
                                  : "Rejected"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Service</Text>
                        <Text style={styles.detailValue}>
                          {firstService?.name || "Service"}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={styles.detailValue}>
                          {new Date(booking.date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Time</Text>
                        <Text style={styles.detailValue}>{booking.time}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Staff</Text>
                        <Text style={styles.detailValue}>
                          {booking.staff?.name || "Not assigned"}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Amount</Text>
                        <Text style={styles.amount}>
                          ₹
                          {Number(booking.amount || 0) -
                            Number(booking.discount || 0)}
                        </Text>
                      </View>
                    </View>
                  );
                })
            )}
          </>
        )}
      </ScrollView>
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
    paddingTop: 15,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#191522",
  },
  subtitle: {
    fontSize: 13,
    color: "#777",
    marginTop: 5,
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 9,
  },
  activeTab: {
    backgroundColor: "#5B3CC4",
  },
  tabText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#777",
  },
  activeTabText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  bookingCard: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  customerName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#191522",
  },
  bookingId: {
    fontSize: 10,
    color: "#999",
    marginTop: 4,
  },
  confirmedBadge: {
    backgroundColor: "#E8F7ED",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  confirmedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2E8B57",
  },
  completedBadge: {
    backgroundColor: "#F0EBFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  completedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5B3CC4",
  },
  rejectedBadge: {
    backgroundColor: "#FDECEC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  rejectedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D64545",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: "#777",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#191522",
  },
  amount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#5B3CC4",
  },
  manageButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  manageText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyBookingCard: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 25,
    alignItems: "center",
  },
  emptyBookingText: {
    fontSize: 13,
    color: "#777",
  },
  notArrivedText: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },
  dateFilterContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8E3F0",
  },
  dateFilterHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dateFilterIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F1ECFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  dateFilterLabelBox: {
    flex: 1,
  },
  dateFilterLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#191522",
  },
  dateFilterHint: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },
  dateFilterButton: {
    minHeight: 58,
    borderRadius: 13,
    backgroundColor: "#F8F6FF",
    borderWidth: 1,
    borderColor: "#DCD2F5",
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedDateLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#8A8199",
    marginBottom: 2,
  },
  dateFilterText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#5B3CC4",
  },
  calendarArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarArrowText: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "300",
    marginTop: -3,
  },
  calendarIcon: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#5B3CC4",
    borderRadius: 5,
    overflow: "hidden",
  },
  calendarTop: {
    height: 6,
    backgroundColor: "#5B3CC4",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  calendarRing: {
    width: 3,
    height: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
  },
  calendarBody: {
    flex: 1,
    paddingHorizontal: 3,
    paddingTop: 3,
  },
  calendarLine: {
    height: 1,
    backgroundColor: "#DCD2F5",
    marginBottom: 3,
  },
  calendarDots: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  calendarDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#5B3CC4",
  },
});
