import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CorrectionScreen() {
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRejectionReason = async () => {
      try {
        const mobile = await AsyncStorage.getItem("partnerMobile");

        if (!mobile) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/api/salons/partner/${mobile}`);

        const data = await response.json();

        if (response.ok && data.salon) {
          setRejectionReason(
            data.salon.rejectionReason || "No rejection reason provided.",
          );
        }
      } catch (error) {
        console.error("Load Rejection Reason Error:", error);
        setRejectionReason("Unable to load rejection reason.");
      } finally {
        setLoading(false);
      }
    };

    loadRejectionReason();
  }, []);
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Correction</Text>
            <Text style={styles.subtitle}>Update your KYC details</Text>
          </View>
        </View>

        {/* Rejection Status */}
        <View style={styles.rejectedCard}>
          <Text style={styles.rejectedTitle}>Verification Rejected</Text>

          <Text style={styles.rejectedDescription}>
            Your verification application needs some corrections before it can
            be approved.
          </Text>
        </View>

        {/* Correction Reason */}
        <Text style={styles.sectionTitle}>Why was it rejected?</Text>

        <View style={styles.reasonCard}>
          <Text style={styles.reasonTitle}>REJECTED REASON</Text>

          {loading ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text style={styles.reasonText}>{rejectionReason}</Text>
          )}
        </View>

        {/* Resubmit */}
        <TouchableOpacity
          style={styles.resubmitButton}
          onPress={() => router.replace("/partner/registration")}
        >
          <Text style={styles.resubmitText}>Resubmit for Verification</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Your updated information will be sent for admin verification again.
        </Text>
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
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
    justifyContent: "center",
  },

  header: {
    marginBottom: 22,
    alignItems: "center",
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

  rejectedCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  rejectedTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#DC2626",
  },

  rejectedDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
    marginTop: 6,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },

  reasonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },

  reasonTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  reasonText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
    marginTop: 6,
  },

  resubmitButton: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },

  resubmitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  note: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 12,
  },
});
