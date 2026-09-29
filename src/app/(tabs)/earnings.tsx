import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EarningsScreen() {
  const [earningsData, setEarningsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadEarnings = async () => {
    try {
      setLoading(true);

      const mobile = await AsyncStorage.getItem("partnerMobile");

      if (!mobile) {
        console.log("Partner mobile not found");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/bookings/partner/${mobile}/monthly-earnings`,
      );

      const data = await response.json();

      if (!response.ok) {
        console.log("Earnings Error:", data);
        return;
      }

      setEarningsData(data);
    } catch (error) {
      console.error("Load Earnings Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEarnings();
    }, []),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color="#5B3CC4" />
          <Text style={{ marginTop: 10, color: "#777" }}>
            Loading earnings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Earnings</Text>
          <Text style={styles.subtitle}>
            Track your salon earnings and settlements
          </Text>
        </View>

        {/* Total Earnings */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>This Month</Text>

          <Text style={styles.totalAmount}>
            ₹
            {Number(earningsData?.monthlyEarnings || 0).toLocaleString("en-IN")}
          </Text>

          <Text style={styles.totalSubtext}>
            Total earnings from completed services
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {earningsData?.completedCount || 0}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ₹
              {Number(earningsData?.todayEarnings || 0).toLocaleString("en-IN")}
            </Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ₹
              {Number(
                earningsData?.pendingSettlementAmount || 0,
              ).toLocaleString("en-IN")}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Settlement */}
        <Text style={styles.sectionTitle}>Settlement</Text>

        <View style={styles.settlementCard}>
          <View>
            <Text style={styles.settlementLabel}>Pending Settlement</Text>

            <Text style={styles.settlementAmount}>
              ₹
              {Number(
                earningsData?.pendingSettlementAmount || 0,
              ).toLocaleString("en-IN")}
            </Text>
          </View>

          <View style={styles.pendingBadge}>
            <Text style={styles.pendingText}>Pending</Text>
          </View>
        </View>

        {/* Recent Earnings */}
        <Text style={styles.sectionTitle}>Recent Earnings</Text>

        {earningsData?.recentEarnings?.length === 0 && (
          <Text
            style={{
              textAlign: "center",
              color: "#777",
              marginTop: 20,
            }}
          >
            No earnings found
          </Text>
        )}

        {earningsData?.recentEarnings?.map((item: any) => (
          <View key={item.id} style={styles.earningCard}>
            <View style={styles.serviceIcon}>
              <Text style={styles.serviceIconText}>₹</Text>
            </View>

            <View style={styles.earningInfo}>
              <Text style={styles.serviceName}>{item.service}</Text>

              <Text style={styles.customer}>{item.customer}</Text>

              <Text style={styles.date}>
                {new Date(item.date).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>

            <Text style={styles.amount}>{item.amount}</Text>
          </View>
        ))}

        {/* Information */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ</Text>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Settlement Information</Text>

            <Text style={styles.infoText}>
              Completed booking earnings will be settled according to the
              settlement schedule.
            </Text>
          </View>
        </View>
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

  totalCard: {
    marginHorizontal: 20,
    backgroundColor: "#5B3CC4",
    borderRadius: 20,
    padding: 22,
  },

  totalLabel: {
    fontSize: 12,
    color: "#DDD3F7",
  },

  totalAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 5,
  },

  totalSubtext: {
    fontSize: 11,
    color: "#DDD3F7",
    marginTop: 5,
  },

  statsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 12,
    gap: 10,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
  },

  statValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#5B3CC4",
  },

  statLabel: {
    fontSize: 10,
    color: "#777",
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#191522",
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 12,
  },

  settlementCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  settlementLabel: {
    fontSize: 12,
    color: "#777",
  },

  settlementAmount: {
    fontSize: 21,
    fontWeight: "800",
    color: "#191522",
    marginTop: 4,
  },

  pendingBadge: {
    backgroundColor: "#FFF4D8",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 15,
  },

  pendingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B07A00",
  },

  earningCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F0EBFF",
    alignItems: "center",
    justifyContent: "center",
  },

  serviceIconText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#5B3CC4",
  },

  earningInfo: {
    flex: 1,
    marginLeft: 12,
  },

  serviceName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#25202F",
  },

  customer: {
    fontSize: 11,
    color: "#666",
    marginTop: 3,
  },

  date: {
    fontSize: 10,
    color: "#999",
    marginTop: 3,
  },

  amount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#5B3CC4",
  },

  infoCard: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: "#F3EEFF",
    borderRadius: 16,
    padding: 15,
    flexDirection: "row",
  },

  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E1D7FF",
    color: "#5B3CC4",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 28,
  },

  infoContent: {
    flex: 1,
    marginLeft: 11,
  },

  infoTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#3D2B73",
  },

  infoText: {
    fontSize: 11,
    color: "#6F6290",
    lineHeight: 17,
    marginTop: 4,
  },
});
