import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_URL } from "@/constants/api";
type Status = "PENDING" | "APPROVED" | "REJECTED";

export default function VerificationScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>("PENDING");
  const [salonName, setSalonName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [applicationId, setApplicationId] = useState("");

  const loadVerificationStatus = async () => {
    try {
      setLoading(true);

      const mobile = await AsyncStorage.getItem("partnerMobile");

      if (!mobile) {
        router.replace("/partner/registration" as any);
        return;
      }

      const response = await fetch(`${API_URL}/api/salons/partner/${mobile}`);

      if (!response.ok) {
        router.replace("/partner/registration" as any);
        return;
      }

      const data = await response.json();

      const salon = data?.salon;
      const partner = data?.partner;

      if (!salon) {
        router.replace("/partner/registration" as any);
        return;
      }

      setSalonName(salon.name || "");
      setOwnerName(salon.ownerName || "");
      setApplicationId(
        partner?.id ? `PARTNER-${String(partner.id).padStart(3, "0")}` : "",
      );

      const currentStatus = salon.status as Status;

      setStatus(currentStatus);

      // Admin approved
      if (currentStatus === "APPROVED") {
        return;
      }

      // Admin rejected
      if (currentStatus === "REJECTED") {
        return;
      }
    } catch (error) {
      console.error("Verification Status Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadVerificationStatus();
    }, []),
  );

  const getStatusTitle = () => {
    if (status === "APPROVED") {
      return "Verification Approved";
    }

    if (status === "REJECTED") {
      return "Verification Rejected";
    }

    return "Verification Submitted";
  };

  const getStatusDescription = () => {
    if (status === "APPROVED") {
      return "Your salon registration and KYC documents have been approved. You can now access your Salon Dashboard.";
    }

    if (status === "REJECTED") {
      return "Your registration needs some corrections. Please review the correction details and re-apply for verification.";
    }

    return "Your salon registration and KYC documents have been submitted successfully. Our admin team will review your details.";
  };

  const getStatusBadge = () => {
    if (status === "APPROVED") {
      return "Approved";
    }

    if (status === "REJECTED") {
      return "Rejected";
    }

    return "Pending Verification";
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5B3CC4" />
          <Text style={styles.loadingText}>
            Checking verification status...
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
          <View style={styles.headerText}>
            <Text style={styles.title}>Admin Verification</Text>

            <Text style={styles.subtitle}>
              {status === "APPROVED"
                ? "Your registration has been approved"
                : status === "REJECTED"
                  ? "Correction is required"
                  : "Your registration is under review"}
            </Text>
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View
            style={[
              styles.statusIcon,
              status === "APPROVED" && styles.statusIconApproved,
              status === "REJECTED" && styles.statusIconRejected,
            ]}
          >
            <Text
              style={[
                styles.statusIconText,
                status === "APPROVED" && styles.statusIconTextApproved,
                status === "REJECTED" && styles.statusIconTextRejected,
              ]}
            >
              {status === "REJECTED" ? "!" : "✓"}
            </Text>
          </View>

          <Text style={styles.statusTitle}>{getStatusTitle()}</Text>

          <Text style={styles.statusDescription}>{getStatusDescription()}</Text>

          <View
            style={[
              styles.statusBadge,
              status === "APPROVED" && styles.statusBadgeApproved,
              status === "REJECTED" && styles.statusBadgeRejected,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                status === "APPROVED" && styles.statusBadgeTextApproved,
                status === "REJECTED" && styles.statusBadgeTextRejected,
              ]}
            >
              {getStatusBadge()}
            </Text>
          </View>
        </View>

        {/* Application Details */}
        <Text style={styles.sectionTitle}>Application Details</Text>

        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Salon Name</Text>
            <Text style={styles.detailValue}>{salonName || "-"}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Owner Name</Text>
            <Text style={styles.detailValue}>{ownerName || "-"}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Application ID</Text>
            <Text style={styles.detailValue}>{applicationId || "-"}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>

            <View
              style={[
                styles.pendingBadge,
                status === "APPROVED" && styles.approvedBadge,
                status === "REJECTED" && styles.rejectedBadge,
              ]}
            >
              <Text
                style={[
                  styles.pendingText,
                  status === "APPROVED" && styles.approvedText,
                  status === "REJECTED" && styles.rejectedText,
                ]}
              >
                {status}
              </Text>
            </View>
          </View>
        </View>

        {/* Verification Steps */}
        <Text style={styles.sectionTitle}>Verification Status</Text>

        <View style={styles.card}>
          <View style={styles.stepRow}>
            <View style={styles.stepIconCompleted}>
              <Text style={styles.stepIconText}>✓</Text>
            </View>

            <View style={styles.stepInfo}>
              <Text style={styles.stepTitle}>Registration Submitted</Text>

              <Text style={styles.stepDescription}>
                Salon registration details received
              </Text>
            </View>
          </View>

          <View style={styles.stepLine} />

          <View style={styles.stepRow}>
            <View
              style={
                status === "PENDING"
                  ? styles.stepIconPending
                  : styles.stepIconCompleted
              }
            >
              <Text
                style={
                  status === "PENDING" ? styles.stepNumber : styles.stepIconText
                }
              >
                {status === "PENDING" ? "2" : "✓"}
              </Text>
            </View>

            <View style={styles.stepInfo}>
              <Text style={styles.stepTitle}>Admin Review</Text>

              <Text style={styles.stepDescription}>
                {status === "PENDING"
                  ? "Admin is reviewing your KYC details"
                  : status === "APPROVED"
                    ? "Admin has approved your KYC details"
                    : "Admin has rejected the submitted details"}
              </Text>
            </View>
          </View>

          <View style={styles.stepLine} />

          <View style={styles.stepRow}>
            <View
              style={
                status === "APPROVED"
                  ? styles.stepIconCompleted
                  : styles.stepIconPending
              }
            >
              <Text
                style={
                  status === "APPROVED"
                    ? styles.stepIconText
                    : styles.stepNumber
                }
              >
                {status === "APPROVED" ? "✓" : "3"}
              </Text>
            </View>

            <View style={styles.stepInfo}>
              <Text style={styles.stepTitle}>Verification Complete</Text>

              <Text style={styles.stepDescription}>
                {status === "APPROVED"
                  ? "Your salon has been approved"
                  : status === "REJECTED"
                    ? "Correction and re-application required"
                    : "Your salon will be approved after verification"}
              </Text>
            </View>
          </View>
        </View>

        {/* Note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteIcon}>ℹ</Text>

          <View style={styles.noteContent}>
            <Text style={styles.noteTitle}>What happens next?</Text>

            <Text style={styles.noteText}>
              {status === "APPROVED"
                ? "Your Salon Dashboard is now available."
                : status === "REJECTED"
                  ? "Please correct the required details and submit your application again."
                  : "Once your application is approved, you will be able to access your Salon Dashboard."}
            </Text>
          </View>
        </View>

        {/* Rejected → Correction */}
        {status === "REJECTED" && (
          <TouchableOpacity
            style={styles.correctionButton}
            activeOpacity={0.8}
            onPress={() => router.push("/partner/correction" as any)}
          >
            <Text style={styles.correctionText}>View Correction</Text>
          </TouchableOpacity>
        )}

        {/* Approved → Dashboard */}
        {status === "APPROVED" && (
          <TouchableOpacity
            style={styles.continueButton}
            activeOpacity={0.8}
            onPress={() => router.replace("/partner/dashboard" as any)}
          >
            <Text style={styles.continueText}>Continue to Dashboard</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.bottomText}>
          {status === "APPROVED"
            ? "Your salon is approved and ready to manage."
            : status === "REJECTED"
              ? "Please complete the correction and re-apply."
              : "Dashboard access will be available after admin approval."}
        </Text>
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

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    fontSize: 12,
    color: "#777",
    marginTop: 10,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    alignItems: "center",
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 23,
    fontWeight: "800",
    color: "#191522",
  },

  subtitle: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },

  statusCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
  },

  statusIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#E8F7ED",
    alignItems: "center",
    justifyContent: "center",
  },

  statusIconApproved: {
    backgroundColor: "#E8F7ED",
  },

  statusIconRejected: {
    backgroundColor: "#FDECEC",
  },

  statusIconText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#2E8B57",
  },

  statusIconTextApproved: {
    color: "#2E8B57",
  },

  statusIconTextRejected: {
    color: "#D64545",
  },

  statusTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#191522",
    marginTop: 15,
  },

  statusDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: "#777",
    textAlign: "center",
    marginTop: 8,
  },

  statusBadge: {
    backgroundColor: "#FFF4D8",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 15,
  },

  statusBadgeApproved: {
    backgroundColor: "#E8F7ED",
  },

  statusBadgeRejected: {
    backgroundColor: "#FDECEC",
  },

  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B07A00",
  },

  statusBadgeTextApproved: {
    color: "#2E8B57",
  },

  statusBadgeTextRejected: {
    color: "#D64545",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#191522",
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 11,
  },

  card: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 30,
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

  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 13,
  },

  pendingBadge: {
    backgroundColor: "#FFF4D8",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },

  approvedBadge: {
    backgroundColor: "#E8F7ED",
  },

  rejectedBadge: {
    backgroundColor: "#FDECEC",
  },

  pendingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B07A00",
  },

  approvedText: {
    color: "#2E8B57",
  },

  rejectedText: {
    color: "#D64545",
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  stepIconCompleted: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F7ED",
    alignItems: "center",
    justifyContent: "center",
  },

  stepIconPending: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0EBFF",
    alignItems: "center",
    justifyContent: "center",
  },

  stepIconText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2E8B57",
  },

  stepNumber: {
    fontSize: 14,
    fontWeight: "800",
    color: "#5B3CC4",
  },

  stepInfo: {
    flex: 1,
    marginLeft: 13,
  },

  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#25202F",
  },

  stepDescription: {
    fontSize: 11,
    color: "#888",
    marginTop: 3,
    lineHeight: 16,
  },

  stepLine: {
    width: 2,
    height: 25,
    backgroundColor: "#E3DFEA",
    marginLeft: 19,
    marginVertical: 4,
  },

  noteCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: "#F3EEFF",
    borderRadius: 16,
    padding: 15,
    flexDirection: "row",
  },

  noteIcon: {
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

  noteContent: {
    flex: 1,
    marginLeft: 11,
  },

  noteTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#3D2B73",
  },

  noteText: {
    fontSize: 11,
    color: "#6F6290",
    lineHeight: 17,
    marginTop: 4,
  },

  correctionButton: {
    height: 50,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: "#FFF4D8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E8C96A",
  },

  correctionText: {
    color: "#B07A00",
    fontSize: 14,
    fontWeight: "700",
  },

  continueButton: {
    height: 54,
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 14,
    backgroundColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  continueText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  bottomText: {
    textAlign: "center",
    fontSize: 11,
    color: "#888",
    marginHorizontal: 35,
    marginTop: 10,
  },
});
