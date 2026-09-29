import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
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

export default function StaffScreen() {
  const [staff, setStaff] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState("");
  const [staffStatus, setStaffStatus] = useState("Available");

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const loadStaff = async () => {
    try {
      const mobile = await AsyncStorage.getItem("partnerMobile");

      if (!mobile) return;

      const salonResponse = await fetch(
        `${API_URL}/api/salons/partner/${mobile}`,
      );

      const salonData = await salonResponse.json();

      if (!salonResponse.ok || !salonData.salon) {
        console.log("Salon Error:", salonData);
        return;
      }

      const salonId = salonData.salon.id;

      const response = await fetch(`${API_URL}/api/staff/${salonId}`);

      const data = await response.json();

      if (!response.ok) {
        console.log("Staff Error:", data);
        return;
      }

      setStaff(
        Array.isArray(data)
          ? data.map((member: any) => ({
              id: member.id,
              name: member.name,
              role: member.role,
              status:
                String(member.status).toUpperCase() === "AVAILABLE"
                  ? "Available"
                  : "Unavailable",
            }))
          : [],
      );
    } catch (error) {
      console.error("Load Staff Error:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStaff();
    }, []),
  );

  const toggleAvailability = async (id: number) => {
    try {
      const member = staff.find((item) => item.id === id);

      if (!member) return;

      const newStatus =
        member.status === "Available" ? "UNAVAILABLE" : "AVAILABLE";

      const response = await fetch(`${API_URL}/api/staff/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Error",
          data.message || "Failed to update staff availability.",
        );
        return;
      }

      await loadStaff();

      Alert.alert(
        "Success",
        newStatus === "AVAILABLE"
          ? "Staff is now available."
          : "Staff is now unavailable.",
      );
    } catch (error) {
      console.error("Toggle Staff Availability Error:", error);

      Alert.alert("Error", "Unable to connect to server.");
    }
  };

  // Open Add Staff popup
  const openAddForm = () => {
    setEditingId(null);
    setStaffName("");
    setStaffRole("");
    setStaffStatus("Available");
    setShowForm(true);
  };

  // Open Edit Staff popup
  const openEditForm = (member: any) => {
    setEditingId(member.id);
    setStaffName(member.name);
    setStaffRole(member.role);
    setStaffStatus(member.status);
    setShowForm(true);
  };

  // Close Add/Edit popup
  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  // Add / Edit Staff
  const saveStaff = async () => {
    if (!staffName.trim() || !staffRole.trim()) {
      return;
    }

    try {
      const mobile = await AsyncStorage.getItem("partnerMobile");

      if (!mobile) {
        Alert.alert("Error", "Partner mobile not found.");
        return;
      }

      // Get current partner salon
      const salonResponse = await fetch(
        `${API_URL}/api/salons/partner/${mobile}`,
      );

      const salonData = await salonResponse.json();

      if (!salonResponse.ok || !salonData.salon) {
        Alert.alert("Error", "Salon details not found.");
        return;
      }

      const salonId = salonData.salon.id;

      // ===============================
      // EDIT STAFF
      // ===============================
      if (editingId !== null) {
        const response = await fetch(`${API_URL}/api/staff/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: staffName.trim(),
            role: staffRole.trim(),
            status: staffStatus === "Available" ? "AVAILABLE" : "UNAVAILABLE",
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          Alert.alert("Error", data.message || "Failed to update staff.");
          return;
        }

        await loadStaff();

        Alert.alert("Success", "Staff updated successfully.");
        closeForm();
        return;
      }

      // ===============================
      // ADD STAFF
      // ===============================
      const response = await fetch(`${API_URL}/api/staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          salonId,
          name: staffName.trim(),
          role: staffRole.trim(),
          status: staffStatus === "Available" ? "AVAILABLE" : "UNAVAILABLE",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.message || "Failed to add staff.");
        return;
      }

      await loadStaff();

      Alert.alert("Success", "Staff added successfully.");
      closeForm();
    } catch (error) {
      console.error("Save Staff Error:", error);

      Alert.alert("Error", "Unable to connect to server.");
    }
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;

    try {
      const response = await fetch(`${API_URL}/api/staff/${deleteId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.message || "Failed to delete staff.");
        return;
      }

      await loadStaff();

      setDeleteId(null);

      Alert.alert("Success", "Staff deleted successfully.");
    } catch (error) {
      console.error("Delete Staff Error:", error);

      Alert.alert("Error", "Unable to connect to server.");
    }
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
            <Text style={styles.title}>Staff Management</Text>
            <Text style={styles.subtitle}>Manage your salon staff</Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.8}
            onPress={openAddForm}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{staff.length}</Text>
            <Text style={styles.summaryLabel}>Total Staff</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.availableValue}>
              {staff.filter((item) => item.status === "Available").length}
            </Text>
            <Text style={styles.summaryLabel}>Available</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.unavailableValue}>
              {staff.filter((item) => item.status === "Unavailable").length}
            </Text>
            <Text style={styles.summaryLabel}>Unavailable</Text>
          </View>
        </View>

        {/* Staff List */}
        <Text style={styles.sectionTitle}>All Staff</Text>

        {staff.map((member) => (
          <View key={member.id} style={styles.staffCard}>
            {/* Avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {member.name.charAt(0).toUpperCase()}
              </Text>
            </View>

            {/* Staff Info */}
            <View style={styles.staffInfo}>
              <Text style={styles.staffName}>{member.name}</Text>

              <Text style={styles.staffRole}>{member.role}</Text>

              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    member.status === "Unavailable" && styles.unavailableDot,
                  ]}
                />

                <Text
                  style={[
                    styles.statusText,
                    member.status === "Unavailable" && styles.unavailableText,
                  ]}
                >
                  {member.status}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.staffActions}>
              {/* Edit */}
              <TouchableOpacity
                style={styles.editButton}
                activeOpacity={0.8}
                onPress={() => openEditForm(member)}
              >
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>

              {/* Availability */}
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  member.status === "Unavailable" && styles.makeAvailableButton,
                ]}
                activeOpacity={0.8}
                onPress={() => toggleAvailability(member.id)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    member.status === "Unavailable" && styles.makeAvailableText,
                  ]}
                >
                  {member.status === "Available" ? "Set Off" : "Set Available"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ</Text>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Staff Availability</Text>

            <Text style={styles.infoText}>
              Available staff can be assigned to customer appointments.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ========================================= */}
      {/* ADD / EDIT STAFF MODAL */}
      {/* ========================================= */}

      <Modal
        visible={showForm}
        transparent
        animationType="fade"
        onRequestClose={closeForm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.formTitle}>
                  {editingId !== null ? "Edit Staff" : "Add New Staff"}
                </Text>

                <Text style={styles.modalSubtitle}>
                  {editingId !== null
                    ? "Update staff details"
                    : "Add a new staff member"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                activeOpacity={0.7}
                onPress={closeForm}
              >
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Staff Name */}
            <Text style={styles.inputLabel}>Staff Name</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter staff name"
              placeholderTextColor="#999"
              value={staffName}
              onChangeText={setStaffName}
            />

            {/* Role */}
            <Text style={styles.inputLabel}>Role</Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. Hair Stylist"
              placeholderTextColor="#999"
              value={staffRole}
              onChangeText={setStaffRole}
            />

            {/* Status */}
            <Text style={styles.inputLabel}>Status</Text>

            <View style={styles.statusToggleRow}>
              <Text
                style={[
                  styles.statusToggleLabel,
                  staffStatus === "Available" && styles.activeStatusLabel,
                ]}
              >
                {staffStatus}
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  setStaffStatus(
                    staffStatus === "Available" ? "Unavailable" : "Available",
                  )
                }
                style={[
                  styles.statusSwitch,
                  staffStatus === "Available"
                    ? styles.statusSwitchOn
                    : styles.statusSwitchOff,
                ]}
              >
                <View
                  style={[
                    styles.statusSwitchThumb,
                    staffStatus === "Available"
                      ? styles.statusThumbOn
                      : styles.statusThumbOff,
                  ]}
                />
              </TouchableOpacity>
            </View>

            {/* Form Buttons */}
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.8}
                onPress={closeForm}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                activeOpacity={0.8}
                onPress={saveStaff}
              >
                <Text style={styles.saveText}>
                  {editingId !== null ? "Save Changes" : "Add Staff"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Delete - Only in Edit */}
            {editingId !== null && (
              <TouchableOpacity
                style={styles.popupDeleteButton}
                activeOpacity={0.8}
                onPress={() => {
                  setShowForm(false);
                  setDeleteId(editingId);
                }}
              >
                <Text style={styles.popupDeleteText}>Delete Staff</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================= */}

      <Modal
        visible={deleteId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalCard}>
            <View style={styles.deleteIcon}>
              <Text style={styles.deleteIconText}>!</Text>
            </View>

            <Text style={styles.deleteTitle}>Delete Staff?</Text>

            <Text style={styles.deleteMessage}>
              Are you sure you want to delete this staff member?
            </Text>

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.8}
                onPress={() => setDeleteId(null)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmDeleteButton}
                activeOpacity={0.8}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    fontSize: 25,
    fontWeight: "800",
    color: "#191522",
  },

  subtitle: {
    fontSize: 13,
    color: "#777",
    marginTop: 5,
  },

  addButton: {
    backgroundColor: "#5B3CC4",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  // Summary
  summaryCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
  },

  summaryValue: {
    fontSize: 21,
    fontWeight: "800",
    color: "#5B3CC4",
  },

  availableValue: {
    fontSize: 21,
    fontWeight: "800",
    color: "#2E8B57",
  },

  unavailableValue: {
    fontSize: 21,
    fontWeight: "800",
    color: "#D64545",
  },

  summaryLabel: {
    fontSize: 10,
    color: "#777",
    marginTop: 3,
  },

  summaryDivider: {
    width: 1,
    height: 35,
    backgroundColor: "#EEEEEE",
  },

  popupDeleteButton: {
    width: "50%",
    alignSelf: "center",
    height: 46,
    borderRadius: 12,
    backgroundColor: "#FDECEC",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#F5CACA",
  },

  popupDeleteText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D64545",
  },

  // Staff
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#191522",
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },

  staffCard: {
    marginHorizontal: 20,
    marginBottom: 11,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E9D9FF",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 19,
    fontWeight: "800",
    color: "#7B2CBF",
  },

  staffInfo: {
    flex: 1,
    marginLeft: 12,
  },

  staffName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#25202F",
  },

  staffRole: {
    fontSize: 11,
    color: "#777",
    marginTop: 3,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2E8B57",
    marginRight: 5,
  },

  unavailableDot: {
    backgroundColor: "#D64545",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2E8B57",
  },

  unavailableText: {
    color: "#D64545",
  },

  staffActions: {
    alignItems: "flex-end",
    gap: 7,
  },

  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  editText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5B3CC4",
  },

  toggleButton: {
    backgroundColor: "#FDECEC",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
  },

  toggleText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#D64545",
  },

  makeAvailableButton: {
    backgroundColor: "#E8F7ED",
  },

  makeAvailableText: {
    color: "#2E8B57",
  },

  deleteButton: {
    backgroundColor: "#FDECEC",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
  },

  deleteText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#D64545",
  },

  // Info
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  modalTitleContainer: {
    flex: 1,
    paddingRight: 10,
  },

  formTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  modalSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  closeText: {
    fontSize: 25,
    color: "#374151",
    lineHeight: 28,
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 7,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 13,
    fontSize: 13,
    color: "#111827",
    marginBottom: 15,
  },

  statusToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 2,
  },

  statusToggleLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D64545",
  },

  activeStatusLabel: {
    color: "#2E8B57",
  },

  statusSwitch: {
    width: 52,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    paddingHorizontal: 3,
  },

  statusSwitchOn: {
    backgroundColor: "#2E8B57",
  },

  statusSwitchOff: {
    backgroundColor: "#D64545",
  },

  statusSwitchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },

  statusThumbOn: {
    alignSelf: "flex-end",
  },

  statusThumbOff: {
    alignSelf: "flex-start",
  },

  formButtons: {
    flexDirection: "row",
    gap: 10,
  },

  cancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },

  saveButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
  },

  saveText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Delete Modal
  deleteModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
  },

  deleteIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FDECEC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  deleteIconText: {
    fontSize: 25,
    fontWeight: "800",
    color: "#D64545",
  },

  deleteTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#191522",
  },

  deleteMessage: {
    fontSize: 12,
    color: "#777",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 7,
    marginBottom: 20,
  },

  confirmDeleteButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#D64545",
    alignItems: "center",
    justifyContent: "center",
  },

  confirmDeleteText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
