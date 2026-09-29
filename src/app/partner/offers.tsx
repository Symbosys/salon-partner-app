import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

type Offer = {
  id: number;
  salonId: number;
  title: string;
  description: string | null;
  discount: number;
  isActive: boolean;
};

export default function OffersScreen() {
  const router = useRouter();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [offerTitle, setOfferTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discount, setDiscount] = useState("");
  const [active, setActive] = useState(true);
  const [editingOfferId, setEditingOfferId] = useState<number | null>(null);

  const fetchOffers = async () => {
    try {
      setLoading(true);

      // 1. Current partner ka mobile number nikalo
      const mobile = await AsyncStorage.getItem("partnerMobile");

      if (!mobile) {
        Alert.alert("Error", "Partner mobile not found.");
        return;
      }

      // 2. Mobile number se current salon find karo
      const salonResponse = await fetch(
        `${API_URL}/api/salons/partner/${mobile}`,
      );

      const salonData = await salonResponse.json();

      if (!salonResponse.ok || !salonData.salon) {
        Alert.alert("Error", "Salon details not found.");
        return;
      }

      // 3. Backend se actual salon ID mil gayi
      const salonId = salonData.salon.id;

      // 4. Ab sirf isi salon ke offers fetch karo
      const response = await fetch(`${API_URL}/api/offers/${salonId}`);
      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.message || "Failed to load offers.");
        return;
      }

      setOffers(data);
    } catch (error) {
      console.error("Load Offers Error:", error);
      Alert.alert("Error", "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const openAddForm = () => {
    setEditingOfferId(null);
    setOfferTitle("");
    setDescription("");
    setDiscount("");
    setActive(true);
    setShowForm(true);
  };

  const openEditForm = (offer: Offer) => {
    setEditingOfferId(offer.id);
    setOfferTitle(offer.title);
    setDescription(offer.description || "");
    setDiscount(String(offer.discount));
    setActive(offer.isActive);
    setShowForm(true);
  };

  const deleteOffer = (id: number) => {
    Alert.alert("Delete Offer", "Are you sure you want to delete this offer?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await fetch(`${API_URL}/api/offers/${id}`, {
              method: "DELETE",
            });

            const data = await response.json();

            if (!response.ok) {
              Alert.alert("Error", data.message || "Failed to delete offer.");
              return;
            }

            setOffers((current) => current.filter((item) => item.id !== id));

            setEditingOfferId(null);
            closeForm();

            Alert.alert("Success", "Offer deleted successfully.");
          } catch (error) {
            console.error("Delete Offer Error:", error);
            Alert.alert("Error", "Unable to connect to server.");
          }
        },
      },
    ]);
  };

  const closeForm = () => {
    setShowForm(false);
  };

  const saveOffer = async () => {
    if (!offerTitle.trim() || !description.trim() || !discount.trim()) {
      Alert.alert("Missing Details", "Please fill all offer details.");
      return;
    }

    const discountValue = Number(discount);

    if (
      !Number.isFinite(discountValue) ||
      discountValue <= 0 ||
      discountValue > 100
    ) {
      Alert.alert("Invalid Discount", "Discount must be between 1% and 100%.");
      return;
    }

    try {
      if (editingOfferId !== null) {
        // EDIT EXISTING OFFER
        const response = await fetch(
          `${API_URL}/api/offers/${editingOfferId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: offerTitle.trim(),
              description: description.trim(),
              discount: discountValue,
              isActive: active,
            }),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          Alert.alert("Error", data.message || "Failed to update offer.");
          return;
        }

        setOffers((current) =>
          current.map((item) =>
            item.id === editingOfferId ? data.offer : item,
          ),
        );

        Alert.alert("Success", "Offer updated successfully.");
        setEditingOfferId(null);
        closeForm();
        return;
      }

      // ADD NEW OFFER

      const mobile = await AsyncStorage.getItem("partnerMobile");

      if (!mobile) {
        Alert.alert("Error", "Partner mobile not found.");
        return;
      }

      const salonResponse = await fetch(
        `${API_URL}/api/salons/partner/${mobile}`,
      );

      const salonData = await salonResponse.json();

      if (!salonResponse.ok || !salonData.salon) {
        Alert.alert("Error", "Salon details not found.");
        return;
      }

      const salonId = salonData.salon.id;

      const response = await fetch(`${API_URL}/api/offers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          salonId,
          title: offerTitle.trim(),
          description: description.trim(),
          discount: discountValue,
          isActive: active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.message || "Failed to add offer.");
        return;
      }

      setOffers((current) => [data.offer, ...current]);

      Alert.alert("Success", "Offer added successfully.");
      closeForm();
    } catch (error) {
      console.error("Save Offer Error:", error);
      Alert.alert("Error", "Unable to connect to server.");
    }
  };

  const toggleOffer = async (id: number) => {
    const offer = offers.find((item) => item.id === id);

    if (!offer) {
      return;
    }

    const newStatus = !offer.isActive;

    try {
      const response = await fetch(`${API_URL}/api/offers/${id}`, {
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
        Alert.alert("Error", data.message || "Failed to update offer.");
        return;
      }

      setOffers((current) =>
        current.map((item) =>
          item.id === id ? { ...item, isActive: data.offer.isActive } : item,
        ),
      );

      Alert.alert(
        "Success",
        newStatus
          ? "Offer enabled successfully."
          : "Offer disabled successfully.",
      );
    } catch (error) {
      console.error("Toggle Offer Error:", error);
      Alert.alert("Error", "Unable to connect to server.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>Offers & Coupons</Text>
            <Text style={styles.subtitle}>Manage offers for your salon</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{offers.length}</Text>
            <Text style={styles.summaryLabel}>Total Offers</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>
              {offers.filter((offer) => offer.isActive).length}
            </Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={openAddForm}
        >
          <Text style={styles.addIcon}>+</Text>
          <Text style={styles.addButtonText}>Add New Offer</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Your Offers</Text>

        {loading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Loading offers...</Text>
          </View>
        ) : offers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No offers yet</Text>
            <Text style={styles.emptyText}>
              Add your first offer to show it to customers.
            </Text>
          </View>
        ) : (
          offers.map((offer) => (
            <View key={offer.id} style={styles.offerCard}>
              <View style={styles.offerTop}>
                <View style={styles.discountBox}>
                  <Text style={styles.discountNumber}>{offer.discount}%</Text>
                  <Text style={styles.discountText}>OFF</Text>
                </View>

                <View style={styles.offerInfo}>
                  <Text style={styles.offerTitle}>{offer.title}</Text>
                  <Text style={styles.offerDescription}>
                    {offer.description || "No description"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    offer.isActive ? styles.activeBadge : styles.inactiveBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      offer.isActive ? styles.activeText : styles.inactiveText,
                    ]}
                  >
                    {offer.isActive ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    { flex: 1, marginTop: 0, backgroundColor: "#F3F0FF" },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => openEditForm(offer)}
                >
                  <Text style={[styles.toggleText, { color: "#5B3CC4" }]}>
                    Edit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    offer.isActive ? styles.disableButton : styles.enableButton,
                    { flex: 1, marginTop: 0 },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => toggleOffer(offer.id)}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      offer.isActive ? styles.disableText : styles.enableText,
                    ]}
                  >
                    {offer.isActive ? "Disable" : "Enable"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Offers & Coupons</Text>
          <Text style={styles.infoText}>
            Create attractive offers for your salon and keep them updated for
            customers.
          </Text>
        </View>
      </ScrollView>

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
                  {editingOfferId !== null ? "Edit Offer" : "Add New Offer"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {editingOfferId !== null
                    ? "Update your salon offer"
                    : "Add an offer to your salon"}
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
              <Text style={styles.inputLabel}>Offer Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Haircut Special"
                placeholderTextColor="#9CA3AF"
                value={offerTitle}
                onChangeText={setOfferTitle}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                placeholder="e.g. Get 25% discount on haircut"
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <Text style={styles.inputLabel}>Discount</Text>
              <View style={styles.discountInputWrapper}>
                <TextInput
                  style={styles.discountInput}
                  placeholder="e.g. 25"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={discount}
                  onChangeText={setDiscount}
                />
                <Text style={styles.percentText}>%</Text>
              </View>

              <View style={styles.activeRow}>
                <View>
                  <Text style={styles.activeTitle}>Offer Status</Text>
                  <Text style={styles.activeSubtitle}>
                    {active ? "Offer is active" : "Offer is inactive"}
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
                  onPress={saveOffer}
                >
                  <Text style={styles.saveText}>
                    {editingOfferId !== null ? "Save Changes" : "Add Offer"}
                  </Text>
                </TouchableOpacity>
              </View>
              {editingOfferId !== null && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  activeOpacity={0.8}
                  onPress={() => deleteOffer(editingOfferId)}
                >
                  <Text style={styles.deleteText}>Delete Offer</Text>
                </TouchableOpacity>
              )}
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  headerText: {
    flex: 1,
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
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },

  offerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },

  offerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  discountBox: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: "#F3F0FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  discountNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#5B3CC4",
  },

  discountText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7C6BC4",
  },

  offerInfo: {
    flex: 1,
    paddingRight: 8,
  },

  offerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  offerDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 5,
    lineHeight: 18,
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
    fontSize: 11,
    fontWeight: "600",
  },

  activeText: {
    color: "#15803D",
  },

  inactiveText: {
    color: "#6B7280",
  },

  toggleButton: {
    marginTop: 14,
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

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 25,
    alignItems: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 19,
  },

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
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 13,
    fontSize: 14,
    color: "#111827",
    marginBottom: 15,
    backgroundColor: "#FFFFFF",
  },

  descriptionInput: {
    height: 80,
    paddingTop: 13,
    textAlignVertical: "top",
  },

  discountInputWrapper: {
    height: 48,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  discountInput: {
    flex: 1,
    height: 46,
    paddingHorizontal: 13,
    fontSize: 14,
    color: "#111827",
  },

  percentText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginRight: 13,
  },

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

  formActions: {
    flexDirection: "row",
    gap: 10,
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

  deleteButton: {
    width: 180,
    height: 50,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 14,
  },

  deleteText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
});
