import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
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

const isToday = (dateString: string) => {
  const selected = new Date(dateString);
  const today = new Date();

  return (
    selected.getFullYear() === today.getFullYear() &&
    selected.getMonth() === today.getMonth() &&
    selected.getDate() === today.getDate()
  );
};

const isPastTime = (time: string, dateString: string) => {
  if (!isToday(dateString)) {
    return false;
  }

  const now = new Date();

  const cleanTime = time.trim().toUpperCase();

  const match = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);

  if (!match) {
    return false;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3];

  if (period === "AM" && hours === 12) {
    hours = 0;
  }

  if (period === "PM" && hours !== 12) {
    hours += 12;
  }

  const slotTime = new Date();

  slotTime.setHours(hours, minutes, 0, 0);

  return slotTime <= now;
};

export default function ScheduleScreen() {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<any[]>([]);
  const [bookedCount, setBookedCount] = useState(0);

  const loadSchedule = async () => {
    try {
      const mobile = await AsyncStorage.getItem("partnerMobile");

      if (!mobile) {
        console.log("Partner mobile not found");
        return;
      }

      const salonResponse = await fetch(
        `${API_URL}/api/salons/partner/${mobile}`,
      );

      const salonData = await salonResponse.json();

      if (!salonResponse.ok || !salonData.salon) {
        console.log("Salon Error:", salonData);
        return;
      }

      const salonId = salonData.salon.id;

      const bookingResponse = await fetch(
        `${API_URL}/api/bookings/partner/${mobile}/today-appointments`,
      );

      const bookingData = await bookingResponse.json();

      if (bookingResponse.ok && Array.isArray(bookingData)) {
        setBookedCount(bookingData.length);
      }

      const response = await fetch(`${API_URL}/api/availability/${salonId}`);

      const data = await response.json();

      if (!response.ok || !Array.isArray(data)) {
        console.log("Schedule Error:", data);
        return;
      }

      const formattedSlots = data.map((slot: any) => {
        const slotDate = new Date(slot.date);

        const slotKey = `${slotDate.getFullYear()}-${String(
          slotDate.getMonth() + 1,
        ).padStart(2, "0")}-${String(slotDate.getDate()).padStart(
          2,
          "0",
        )}_${slot.time}`;

        const isBooked = bookingData.some((booking: any) => {
          // Cancelled bookings should not block the slot
          if (booking.status === "CANCELLED") {
            return false;
          }

          const bookingDate = new Date(booking.date);

          const bookingKey = `${bookingDate.getFullYear()}-${String(
            bookingDate.getMonth() + 1,
          ).padStart(2, "0")}-${String(bookingDate.getDate()).padStart(
            2,
            "0",
          )}_${booking.time}`;

          return bookingKey === slotKey;
        });

        return {
          id: slot.id,
          date: slot.date,
          time: slot.time,
          isAvailable: slot.isAvailable,
          status: isBooked
            ? "Booked"
            : slot.isAvailable
              ? "Available"
              : "Unavailable",
        };
      });

      setSlots(formattedSlots);

      if (formattedSlots.length > 0 && !selectedDate) {
        const firstDate = new Date(formattedSlots[0].date);

        setSelectedDate(
          `${firstDate.getFullYear()}-${String(
            firstDate.getMonth() + 1,
          ).padStart(2, "0")}-${String(firstDate.getDate()).padStart(2, "0")}`,
        );
      }
    } catch (error) {
      console.error("Load Schedule Error:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSchedule();
    }, []),
  );

  const uniqueDates = Array.from(
    new Map(
      slots.map((slot) => {
        const date = new Date(slot.date);

        const fullDate = `${date.getFullYear()}-${String(
          date.getMonth() + 1,
        ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

        return [
          fullDate,
          {
            day: date.toLocaleDateString("en-US", {
              weekday: "short",
            }),
            date: date.toLocaleDateString("en-US", {
              day: "2-digit",
              month: "short",
            }),
            fullDate,
          },
        ];
      }),
    ).values(),
  );

  const availableCount = slots.filter((slot) => {
    const date = new Date(slot.date);

    const slotDate = `${date.getFullYear()}-${String(
      date.getMonth() + 1,
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    const today = new Date();

    const todayDate = `${today.getFullYear()}-${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    return slotDate === todayDate && slot.status === "Available";
  }).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>Schedule & Slots</Text>

            <Text style={styles.subtitle}>
              Manage your salon's available time slots
            </Text>
          </View>
        </View>

        {/* Date Selection */}
        <Text style={styles.sectionTitle}>Select Date</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateList}
        >
          {uniqueDates.map((item) => {
            const selected = selectedDate === item.fullDate;

            return (
              <TouchableOpacity
                key={item.fullDate}
                style={[styles.dateCard, selected && styles.selectedDateCard]}
                onPress={() => setSelectedDate(item.fullDate)}
              >
                <Text
                  style={[styles.dayText, selected && styles.selectedDateText]}
                >
                  {item.day}
                </Text>

                <Text
                  style={[styles.dateText, selected && styles.selectedDateText]}
                >
                  {item.date}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{availableCount}</Text>

            <Text style={styles.summaryLabel}>Available</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{bookedCount}</Text>

            <Text style={styles.summaryLabel}>Booked</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {
                slots.filter((slot) => {
                  const date = new Date(slot.date);

                  const slotDate = `${date.getFullYear()}-${String(
                    date.getMonth() + 1,
                  ).padStart(
                    2,
                    "0",
                  )}-${String(date.getDate()).padStart(2, "0")}`;

                  const today = new Date();

                  const todayDate = `${today.getFullYear()}-${String(
                    today.getMonth() + 1,
                  ).padStart(
                    2,
                    "0",
                  )}-${String(today.getDate()).padStart(2, "0")}`;

                  return slotDate === todayDate;
                }).length
              }
            </Text>

            <Text style={styles.summaryLabel}>Total Slots</Text>
          </View>
        </View>

        {/* Time Slots */}
        <View style={styles.slotHeader}>
          <View>
            <Text style={styles.sectionTitle}>Time Slots</Text>

            <Text style={styles.selectedDateLabel}>{selectedDate}</Text>
          </View>
        </View>

        <View style={styles.slotsContainer}>
          {slots
            .filter(
              (slot) =>
                (() => {
                  const date = new Date(slot.date);

                  return `${date.getFullYear()}-${String(
                    date.getMonth() + 1,
                  ).padStart(
                    2,
                    "0",
                  )}-${String(date.getDate()).padStart(2, "0")}`;
                })() === selectedDate,
            )
            .map((slot, index) => {
              const available = slot.status === "Available";

              // NEW: today's past time slot
              const pastTime = isPastTime(slot.time, slot.date);

              // Booked OR past time = disabled
              const disabled = slot.status === "Booked" || pastTime;

              return (
                <TouchableOpacity
                  key={`${slot.time}-${index}`}
                  disabled={disabled}
                  style={[
                    styles.slotCard,
                    available ? styles.availableSlot : styles.bookedSlot,
                    pastTime && styles.pastSlot,
                  ]}
                  onPress={async () => {
                    if (slot.status === "Booked" || pastTime) {
                      return;
                    }

                    try {
                      const response = await fetch(
                        `${API_URL}/api/availability/${slot.id}/status`,
                        {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            isAvailable: !slot.isAvailable,
                          }),
                        },
                      );

                      const data = await response.json();

                      if (!response.ok) {
                        Alert.alert(
                          "Error",
                          data.message || "Unable to update slot",
                        );
                        return;
                      }

                      await loadSchedule();
                    } catch (error) {
                      console.error("Update Slot Error:", error);
                      Alert.alert("Error", "Something went wrong");
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.slotTime,
                      available ? styles.availableText : styles.bookedText,
                      pastTime && styles.pastText,
                    ]}
                  >
                    {slot.time}
                  </Text>

                  <Text
                    style={[
                      styles.slotStatus,
                      available ? styles.availableText : styles.bookedText,
                      pastTime && styles.pastText,
                    ]}
                  >
                    {slot.status}
                  </Text>
                </TouchableOpacity>
              );
            })}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Schedule Management</Text>

          <Text style={styles.infoText}>
            Tap an Available slot to make it Unavailable, or tap an Unavailable
            slot to make it Available. Booked slots are managed automatically
            from customer bookings.
          </Text>
        </View>
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

  /* Header */

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  backText: {
    fontSize: 32,
    lineHeight: 34,
    color: "#191522",
    marginTop: -3,
  },

  headerText: {
    flex: 1,
    justifyContent: "center",
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 5,
  },

  /* Section */

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  /* Dates */

  dateList: {
    paddingVertical: 14,
    gap: 10,
  },

  dateCard: {
    width: 78,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  selectedDateCard: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },

  dayText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },

  dateText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  selectedDateText: {
    color: "#FFFFFF",
  },

  /* Summary */

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 26,
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
  },

  summaryNumber: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },

  summaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },

  summaryDivider: {
    width: 1,
    height: 35,
    backgroundColor: "#E5E7EB",
  },

  /* Slots */

  slotHeader: {
    marginBottom: 12,
  },

  selectedDateLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },

  slotsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },

  slotCard: {
    width: "31%",
    minHeight: 70,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },

  availableSlot: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },

  bookedSlot: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },

  /* Only for today's past time slots */
  pastSlot: {
    opacity: 0.45,
  },

  slotTime: {
    fontSize: 13,
    fontWeight: "700",
  },

  slotStatus: {
    fontSize: 11,
    marginTop: 5,
    fontWeight: "600",
  },

  availableText: {
    color: "#15803D",
  },

  bookedText: {
    color: "#DC2626",
  },

  pastText: {
    color: "#6B7280",
  },

  /* Save Button */

  saveButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  /* Info */

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },

  infoText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
  },
});
