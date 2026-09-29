import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
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

import { API_URL } from "@/constants/api";
const ICON_OPTIONS = [
  "✂️",
  "🎨",
  "🧔",
  "✨",
  "💆",
  "💅",
  "💄",
  "🧖",
  "💇",
  "🪮",
  "🌸",
  "⭐",
];

export default function ServicesScreen() {
  const router = useRouter();

  const [services, setServices] = useState<any[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [serviceName, setServiceName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [icon, setIcon] = useState("✂️");
  const [active, setActive] = useState(true);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const loadServices = async () => {
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

      const response = await fetch(`${API_URL}/api/services/${salonId}`);

      const data = await response.json();

      if (!response.ok) {
        console.log("Services Error:", data);
        return;
      }

      setServices(
        Array.isArray(data)
          ? data.map((service: any) => ({
              id: service.id,
              name: service.name,
              category: service.category || "",
              price: Number(service.price),
              duration: `${service.duration} min`,
              icon: service.icon || "✂️",
              active: Boolean(service.isActive),
            }))
          : [],
      );
    } catch (error) {
      console.error("Load Services Error:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadServices();
    }, []),
  );

  const toggleService = async (id: number) => {
    try {
      const service = services.find((item) => item.id === id);

      if (!service) return;

      const newStatus = !service.active;

      const response = await fetch(`${API_URL}/api/services/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          "Error",
          data.message || "Failed to update service status.",
        );
        return;
      }

      await loadServices();

      Alert.alert(
        "Success",
        newStatus
          ? "Service enabled successfully."
          : "Service disabled successfully.",
      );
    } catch (error) {
      console.error("Toggle Service Error:", error);

      Alert.alert("Error", "Unable to connect to server.");
    }
  };

  const openAddForm = () => {
    setEditingId(null);
    setServiceName("");
    setCategory("");
    setPrice("");
    setDuration("");
    setIcon("✂️");
    setActive(true);
    setShowForm(true);
  };

  const openEditForm = (service: any) => {
    setEditingId(service.id);
    setServiceName(service.name);
    setCategory(service.category);
    setPrice(String(service.price));
    setDuration(service.duration.replace(" min", ""));
    setIcon(service.icon || "✂️");
    setActive(service.active);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const saveService = async () => {
    if (!serviceName || !category || !price || !duration) {
      Alert.alert("Missing Details", "Please fill all service details.");
      return;
    }

    // ===============================
    // EDIT SERVICE
    // ===============================
    if (editingId !== null) {
      try {
        const response = await fetch(`${API_URL}/api/services/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: serviceName,
            category,
            price: Number(price),
            duration: Number(duration),
            icon,
            isActive: active,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          Alert.alert("Error", data.message || "Failed to update service.");
          return;
        }

        await loadServices();

        Alert.alert("Success", "Service updated successfully.");

        closeForm();
        return;
      } catch (error) {
        console.error("Update Service Error:", error);

        Alert.alert("Error", "Unable to connect to server.");
        return;
      }
    }

    // ===============================
    // ADD NEW SERVICE
    // ===============================
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

      // Create service
      const response = await fetch(`${API_URL}/api/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          salonId,
          name: serviceName,
          category,
          price: Number(price),
          duration: Number(duration),
          icon,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.message || "Failed to add service.");
        return;
      }

      const newService = {
        id: data.service.id,
        name: data.service.name,
        category: data.service.category,
        price: Number(data.service.price),
        duration: `${data.service.duration} min`,
        icon: data.service.icon || icon,
        active: Boolean(data.service.isActive),
      };

      setServices((current) => [...current, newService]);

      Alert.alert("Success", "Service added successfully.");

      closeForm();
    } catch (error) {
      console.error("Add Service Error:", error);

      Alert.alert("Error", "Unable to connect to server.");
    }
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;

    try {
      const response = await fetch(`${API_URL}/api/services/${deleteId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.message || "Failed to delete service.");
        return;
      }

      await loadServices();

      setDeleteId(null);
      closeForm();

      Alert.alert("Success", "Service deleted successfully.");
    } catch (error) {
      console.error("Delete Service Error:", error);

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
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>Services & Pricing</Text>
            <Text style={styles.subtitle}>Manage your salon services</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{services.length}</Text>
            <Text style={styles.summaryLabel}>Total Services</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {services.filter((service) => service.active).length}
            </Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
        </View>

        {/* Add Service */}
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={openAddForm}
        >
          <Text style={styles.addIcon}>+</Text>
          <Text style={styles.addButtonText}>Add New Service</Text>
        </TouchableOpacity>

        {/* Services */}
        <Text style={styles.sectionTitle}>Your Services</Text>

        {services.map((service) => (
          <View key={service.id} style={styles.serviceCard}>
            <View style={styles.serviceTop}>
              <View style={styles.serviceIconContainer}>
                <Text style={styles.serviceIcon}>{service.icon}</Text>
              </View>

              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>

                <Text style={styles.category}>{service.category}</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  service.active ? styles.activeBadge : styles.inactiveBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    service.active ? styles.activeText : styles.inactiveText,
                  ]}
                >
                  {service.active ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>

            <View style={styles.serviceDetails}>
              <View>
                <Text style={styles.detailLabel}>Price</Text>

                <Text style={styles.price}>₹{service.price}</Text>
              </View>

              <View>
                <Text style={styles.detailLabel}>Duration</Text>

                <Text style={styles.duration}>{service.duration}</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.editButton}
                activeOpacity={0.8}
                onPress={() => openEditForm(service)}
              >
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  service.active ? styles.disableButton : styles.enableButton,
                ]}
                activeOpacity={0.8}
                onPress={() => toggleService(service.id)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    service.active ? styles.disableText : styles.enableText,
                  ]}
                >
                  {service.active ? "Disable" : "Enable"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Services & Pricing</Text>

          <Text style={styles.infoText}>
            Keep your service prices and durations updated so customers can see
            the latest information while booking.
          </Text>
        </View>
      </ScrollView>

      {/* Add / Edit Service Modal */}
      <Modal
        visible={showForm}
        transparent
        animationType="fade"
        onRequestClose={closeForm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.formTitle}>
                  {editingId !== null ? "Edit Service" : "Add New Service"}
                </Text>

                <Text style={styles.modalSubtitle}>
                  {editingId !== null
                    ? "Update service details"
                    : "Add a new service to your salon"}
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

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Service Name */}
              <Text style={styles.inputLabel}>Service Name</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter service name"
                placeholderTextColor="#9CA3AF"
                value={serviceName}
                onChangeText={setServiceName}
              />

              {/* Category */}
              <Text style={styles.inputLabel}>Category</Text>

              <TextInput
                style={styles.input}
                placeholder="e.g. Hair, Beauty, Grooming"
                placeholderTextColor="#9CA3AF"
                value={category}
                onChangeText={setCategory}
              />

              {/* Icon */}
              <Text style={styles.inputLabel}>Service Icon</Text>

              <View style={styles.iconGrid}>
                {ICON_OPTIONS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.iconOption,
                      icon === item && styles.selectedIconOption,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setIcon(item)}
                  >
                    <Text style={styles.iconOptionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Price */}
              <Text style={styles.inputLabel}>Price</Text>

              <View style={styles.priceInputWrapper}>
                <Text style={styles.rupee}>₹</Text>

                <TextInput
                  style={styles.priceInput}
                  placeholder="Enter price"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>

              {/* Duration */}
              <Text style={styles.inputLabel}>Duration</Text>

              <View style={styles.durationInputWrapper}>
                <TextInput
                  style={styles.durationInput}
                  placeholder="e.g. 30"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={duration}
                  onChangeText={setDuration}
                />

                <Text style={styles.minText}>min</Text>
              </View>

              {/* Status */}
              <View style={styles.activeRow}>
                <View>
                  <Text style={styles.activeTitle}>Service Status</Text>

                  <Text style={styles.activeSubtitle}>
                    {active ? "Service is active" : "Service is inactive"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.statusToggle,
                    active
                      ? styles.statusToggleActive
                      : styles.statusToggleInactive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setActive((value) => !value)}
                >
                  <View style={styles.toggleCircle} />
                </TouchableOpacity>
              </View>

              {/* Cancel + Save */}
              <View style={styles.formActions}>
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
                  onPress={saveService}
                >
                  <Text style={styles.saveText}>
                    {editingId !== null ? "Save Changes" : "Add Service"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Delete Service - Only Edit */}
              {editingId !== null && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  activeOpacity={0.8}
                  onPress={() => setDeleteId(editingId)}
                >
                  <Text style={styles.deleteText}>Delete Service</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteId(null)}
      >
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteCard}>
            <Text style={styles.deleteTitle}>Delete Service?</Text>

            <Text style={styles.deleteMessage}>
              Are you sure you want to delete this service?
            </Text>

            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                activeOpacity={0.8}
                onPress={() => setDeleteId(null)}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteConfirmButton}
                activeOpacity={0.8}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteConfirmText}>Delete</Text>
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
    marginBottom: 22,
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

  /* Summary */

  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  summaryItem: {
    flex: 1,
    alignItems: "center",
  },

  summaryNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },

  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },

  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5E7EB",
  },

  /* Add Button */

  addButton: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },

  addIcon: {
    color: "#FFFFFF",
    fontSize: 22,
    marginRight: 8,
    lineHeight: 22,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  /* Services */

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },

  serviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },

  serviceTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  serviceIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F3F0FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  serviceIcon: {
    fontSize: 24,
  },

  serviceInfo: {
    flex: 1,
  },

  serviceName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  category: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  activeBadge: {
    backgroundColor: "#E8F7EE",
  },

  inactiveBadge: {
    backgroundColor: "#F3F4F6",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },

  activeText: {
    color: "#15803D",
  },

  inactiveText: {
    color: "#6B7280",
  },

  serviceDetails: {
    flexDirection: "row",
    gap: 45,
    marginTop: 18,
    marginBottom: 16,
  },

  detailLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 3,
  },

  price: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  duration: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },

  actions: {
    flexDirection: "row",
    gap: 10,
  },

  editButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },

  editText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },

  toggleButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },

  disableButton: {
    backgroundColor: "#FEF2F2",
  },

  enableButton: {
    backgroundColor: "#E8F7EE",
  },

  toggleText: {
    fontSize: 14,
    fontWeight: "600",
  },

  disableText: {
    color: "#DC2626",
  },

  enableText: {
    color: "#15803D",
  },

  /* Info */

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
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

  /* Modal */

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
    maxHeight: "85%",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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

  /* Modal Inputs */

  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 7,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 13,
    fontSize: 14,
    color: "#111827",
    marginBottom: 15,
    backgroundColor: "#FFFFFF",
  },

  /* Icon */

  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 15,
  },

  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  selectedIconOption: {
    borderWidth: 2,
    borderColor: "#5B3CC4",
    backgroundColor: "#F3F0FF",
  },

  iconOptionText: {
    fontSize: 24,
  },

  priceInputWrapper: {
    height: 48,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  rupee: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginLeft: 13,
  },

  priceInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 8,
    fontSize: 14,
    color: "#111827",
  },

  durationInputWrapper: {
    height: 48,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  durationInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 13,
    fontSize: 14,
    color: "#111827",
  },

  minText: {
    fontSize: 13,
    color: "#6B7280",
    marginRight: 13,
  },

  /* Status */

  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    marginBottom: 18,
  },

  activeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  activeSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
  },

  statusToggle: {
    width: 48,
    height: 27,
    borderRadius: 20,
    justifyContent: "center",
    paddingHorizontal: 3,
  },

  statusToggleActive: {
    backgroundColor: "#5B3CC4",
    alignItems: "flex-end",
  },

  statusToggleInactive: {
    backgroundColor: "#D1D5DB",
    alignItems: "flex-start",
  },

  toggleCircle: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },

  /* Modal Buttons */

  formActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 5,
  },

  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },

  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
  },

  saveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* Delete Button */

  deleteButton: {
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

  deleteText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D64545",
  },

  /* Delete Confirmation */

  deleteOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
  },

  deleteCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 22,
  },

  deleteTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  deleteMessage: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },

  deleteActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },

  deleteCancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },

  deleteConfirmButton: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#D64545",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteConfirmText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
