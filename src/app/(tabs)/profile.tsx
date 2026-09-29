import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const [editVisible, setEditVisible] = useState(false);

  const [salonName, setSalonName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [kycStatus, setKycStatus] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const partnerMobile = await AsyncStorage.getItem("partnerMobile");

      if (!partnerMobile) {
        Alert.alert("Error", "Partner mobile not found.");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/salons/partner/${partnerMobile}`,
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.message || "Unable to load profile.");
        return;
      }

      const salon = data.salon || data;

      setSalonName(salon.name || "");
      setOwnerName(salon.ownerName || "");
      setMobile(salon.mobile || partnerMobile);
      setEmail(salon.email || "");
      setAddress(
        [salon.address, salon.city, salon.state, salon.pincode]
          .filter(Boolean)
          .join(", "),
      );

      setKycStatus(salon.kycStatus || salon.status || "Pending");

      setPartnerId(
        salon.partnerId
          ? `PARTNER-${String(salon.partnerId).padStart(3, "0")}`
          : "",
      );
    } catch (error) {
      console.error("Load Profile Error:", error);
      Alert.alert("Error", "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, []),
  );

  const handleSave = async () => {
    try {
      const partnerMobile = await AsyncStorage.getItem("partnerMobile");

      if (!partnerMobile) {
        Alert.alert("Error", "Partner mobile not found.");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/salons/partner/${partnerMobile}/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: salonName,
            ownerName: ownerName,
            email: email,
            address: address,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.message || "Unable to update profile.");
        return;
      }

      setEditVisible(false);

      await loadProfile();

      Alert.alert(
        "Profile Updated",
        "Your salon profile has been updated successfully.",
      );
    } catch (error) {
      console.error("Update Profile Error:", error);

      Alert.alert("Error", "Unable to update profile.");
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("partnerMobile");

            router.replace("/partner/login");
          } catch (error) {
            console.error("Logout Error:", error);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>Manage your salon details</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {salonName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        {/* Salon Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.largeAvatar}>
              <Text style={styles.largeAvatarText}>
                {salonName.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.salonName}>{salonName}</Text>

              <Text style={styles.ownerName}>Owner: {ownerName}</Text>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>✓ Verified Partner</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            activeOpacity={0.8}
            onPress={() => setEditVisible(true)}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
        {/* Salon Details */}
        <Text style={styles.sectionTitle}>Salon Details</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Salon Name</Text>
            <Text style={styles.value}>{salonName}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Owner Name</Text>
            <Text style={styles.value}>{ownerName}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Mobile Number</Text>
            <Text style={styles.value}>{mobile}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{email}</Text>
          </View>
        </View>
        {/* Address */}
        <Text style={styles.sectionTitle}>Salon Address</Text>
        <View style={styles.card}>
          <Text style={styles.address}>{address || "-"}</Text>
        </View>
        {/* KYC */}
        <Text style={styles.sectionTitle}>KYC & Verification</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>KYC Status</Text>

            <View style={styles.kycBadge}>
              <Text style={styles.kycText}>{kycStatus || "-"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Partner ID</Text>
            <Text style={styles.value}>{partnerId || "-"}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <Text style={styles.modalSubtitle}>
                  Update your salon information
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setEditVisible(false)}
              >
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Salon Name */}
              <Text style={styles.inputLabel}>Salon Name</Text>

              <TextInput
                style={styles.input}
                value={salonName}
                onChangeText={setSalonName}
                placeholder="Enter salon name"
                placeholderTextColor="#9CA3AF"
              />

              {/* Owner Name */}
              <Text style={styles.inputLabel}>Owner Name</Text>

              <TextInput
                style={styles.input}
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="Enter owner name"
                placeholderTextColor="#9CA3AF"
              />

              {/* Mobile */}
              <Text style={styles.inputLabel}>Mobile Number</Text>

              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={mobile}
                editable={false}
                selectTextOnFocus={false}
                placeholder="Mobile number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />

              {/* Email */}
              <Text style={styles.inputLabel}>Email</Text>

              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Buttons */}
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  activeOpacity={0.8}
                  onPress={() => setEditVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  activeOpacity={0.8}
                  onPress={handleSave}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },

  topEditButton: {
    backgroundColor: "#111827",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },

  topEditText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },

  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  editButton: {
    height: 44,
    backgroundColor: "#111827",
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  editButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  /* Profile */

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 26,
  },

  largeAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },

  largeAvatarText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
  },

  profileInfo: {
    flex: 1,
  },

  salonName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  ownerName: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },

  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F7EE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 8,
  },

  statusText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "600",
  },

  /* Sections */

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
    minHeight: 30,
  },

  label: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
  },

  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    textAlign: "right",
    flex: 1.2,
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },

  address: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },

  /* KYC */

  kycBadge: {
    backgroundColor: "#E8F7EE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },

  kycText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "600",
  },

  /* Modal */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },

  modalSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  closeText: {
    fontSize: 26,
    color: "#374151",
    lineHeight: 28,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 7,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FAFAFA",
    marginBottom: 17,
  },

  modalButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 5,
    marginBottom: 10,
  },

  cancelButton: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },

  saveButton: {
    flex: 1.4,
    height: 50,
    backgroundColor: "#111827",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  disabledInput: {
    backgroundColor: "#F3F4F6",
    color: "#6B7280",
  },

  logoutButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D64545",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    marginBottom: 20,
  },

  logoutButtonText: {
    color: "#D64545",
    fontSize: 14,
    fontWeight: "700",
  },
});
