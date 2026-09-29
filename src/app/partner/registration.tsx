import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_URL } from "@/constants/api";
const GOOGLE_MAPS_API_KEY =
  Constants.expoConfig?.extra?.googleMapsWebApiKey || "";

export default function PartnerRegistrationScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  // const [draftLoaded, setDraftLoaded] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [salonImage, setSalonImage] = useState<string | null>(null);
  const [aadhaarDocument, setAadhaarDocument] = useState<string | null>(null);
  const [panDocument, setPanDocument] = useState<string | null>(null);

  const [salonName, setSalonName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  useEffect(() => {
    const loadPartnerMobile = async () => {
      try {
        const savedMobile = await AsyncStorage.getItem("partnerMobile");

        if (savedMobile) {
          setMobileNumber(savedMobile);
        }
      } catch (error) {
        console.error("Load Partner Mobile Error:", error);
      }
    };

    loadPartnerMobile();
  }, []);

  const pickSalonImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setSalonImage(result.assets[0].uri);
      setErrors((prev) => ({ ...prev, salonImage: "" }));
    }
  };

  const pickDocument = async (type: "aadhaar" | "pan") => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });

    if (!result.canceled) {
      const fileUri = result.assets[0].uri;

      if (type === "aadhaar") {
        setAadhaarDocument(fileUri);
        setErrors((prev) => ({ ...prev, aadhaarDocument: "" }));
      } else {
        setPanDocument(fileUri);
        setErrors((prev) => ({ ...prev, panDocument: "" }));
      }
    }
  };

  const getFieldError = (field: string, value: string) => {
    switch (field) {
      case "salonName":
        return !value.trim() ? "Salon name is required" : "";

      case "ownerName":
        return !value.trim() ? "Owner name is required" : "";

      case "email":
        if (!value.trim()) return "Email address is required";
        if (!/^\S+@\S+\.\S+$/.test(value.trim())) {
          return "Enter a valid email address";
        }
        return "";

      case "address":
        return !value.trim() ? "Address is required" : "";

      case "city":
        return !value.trim() ? "City is required" : "";

      case "state":
        return !value.trim() ? "State is required" : "";

      case "pincode":
        if (!value.trim()) return "Pincode is required";
        if (!/^\d{6}$/.test(value.trim())) {
          return "Enter a valid 6-digit pincode";
        }
        return "";

      case "aadhaarNumber":
        if (!value.trim()) return "Aadhaar number is required";
        if (!/^\d{12}$/.test(value.trim())) {
          return "Enter a valid 12-digit Aadhaar number";
        }
        return "";

      case "panNumber":
        if (!value.trim()) return "PAN number is required";
        if (!/^[A-Z0-9]{10}$/.test(value.trim().toUpperCase())) {
          return "PAN must be 10 alphanumeric characters";
        }
        return "";

      default:
        return "";
    }
  };

  const validateField = (field: string, value: string) => {
    setErrors((prev) => ({
      ...prev,
      [field]: getFieldError(field, value),
    }));
  };

  const validateCurrentStep = () => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      const fields: [string, string][] = [
        ["salonName", salonName],
        ["ownerName", ownerName],
        ["email", email],
      ];

      fields.forEach(([field, value]) => {
        const error = getFieldError(field, value);
        if (error) {
          newErrors[field] = error;
        }
      });
    }

    if (currentStep === 2) {
      if (!salonImage) {
        newErrors.salonImage = "Salon image is required";
      }

      if (!selectedCategory) {
        newErrors.category = "Select salon type";
      }
    }

    if (currentStep === 3) {
      const fields: [string, string][] = [
        ["address", address],
        ["city", city],
        ["state", state],
        ["pincode", pincode],
      ];

      fields.forEach(([field, value]) => {
        const error = getFieldError(field, value);
        if (error) {
          newErrors[field] = error;
        }
      });
    }

    if (currentStep === 4) {
      const fields: [string, string][] = [
        ["aadhaarNumber", aadhaarNumber],
        ["panNumber", panNumber],
      ];

      fields.forEach(([field, value]) => {
        const error = getFieldError(field, value);
        if (error) {
          newErrors[field] = error;
        }
      });

      if (!aadhaarDocument) {
        newErrors.aadhaarDocument = "Aadhaar document is required";
      }

      if (!panDocument) {
        newErrors.panDocument = "PAN document is required";
      }
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const fields: [string, string][] = [
      ["salonName", salonName],
      ["ownerName", ownerName],
      ["email", email],
      ["address", address],
      ["city", city],
      ["state", state],
      ["pincode", pincode],
      ["aadhaarNumber", aadhaarNumber],
      ["panNumber", panNumber],
    ];

    fields.forEach(([field, value]) => {
      const error = getFieldError(field, value);
      if (error) newErrors[field] = error;
    });

    if (!selectedCategory) newErrors.category = "Select salon type";
    if (!salonImage) newErrors.salonImage = "Salon image is required";
    if (!aadhaarDocument) {
      newErrors.aadhaarDocument = "Aadhaar document is required";
    }
    if (!panDocument) {
      newErrors.panDocument = "PAN document is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchAddressFromCoordinates = async (
    latitudeValue: number,
    longitudeValue: number,
  ) => {
    try {
      console.log("Fetching address for:", latitudeValue, longitudeValue);

      const response = await fetch(
        `${API_URL}/api/salons/reverse-geocode?latitude=${latitudeValue}&longitude=${longitudeValue}`,
      );

      const data = await response.json();

      console.log("Ola Reverse Geocode Response:", response.status, data);

      if (!response.ok) {
        console.error("Ola Reverse Geocode Failed:", data);
        return;
      }

      const result = data?.results?.[0];

      if (!result) {
        console.warn("No address result returned from Ola Maps");
        return;
      }

      const components = result.address_components || [];

      console.log(
        "OLA ADDRESS COMPONENTS:",
        JSON.stringify(components, null, 2),
      );

      const getComponent = (type: string) => {
        const component = components.find((item: any) =>
          item.types?.includes(type),
        );

        return component?.long_name || "";
      };

      const detectedCity =
        getComponent("locality") ||
        getComponent("administrative_area_level_2") ||
        "";

      const detectedState = getComponent("administrative_area_level_1");

      const detectedPincode = getComponent("postal_code");

      const detectedAddress = components
        .filter((item: any) => {
          const types = item.types || [];

          return (
            types.includes("route") ||
            types.includes("street_address") ||
            types.includes("premise") ||
            types.includes("subpremise") ||
            types.includes("neighborhood") ||
            types.includes("sublocality")
          );
        })
        .map((item: any) => item.long_name)
        .filter(Boolean)
        .join(", ");

      console.log("========== OLA LOCATION ==========");
      console.log("Address:", detectedAddress);
      console.log("City:", detectedCity);
      console.log("State:", detectedState);
      console.log("Pincode:", detectedPincode);
      console.log("==================================");

      setAddress(detectedAddress);
      setCity(detectedCity);
      setState(detectedState);
      setPincode(detectedPincode);

      setErrors((prev) => ({
        ...prev,
        address: "",
        city: "",
        state: "",
        pincode: "",
        location: "",
      }));
    } catch (error) {
      console.error("Fetch Address From Coordinates Error:", error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      // Check current permission
      let permission = await Location.getForegroundPermissionsAsync();

      // Permission not granted yet
      if (permission.status !== "granted") {
        if (permission.canAskAgain) {
          const requestedPermission =
            await Location.requestForegroundPermissionsAsync();

          if (requestedPermission.status !== "granted") {
            Alert.alert(
              "Location Permission Required",
              "We need access to your location to identify and select your salon's exact location.",
              [
                {
                  text: "Try Again",
                  onPress: () => {
                    getCurrentLocation();
                  },
                },
                {
                  text: "Cancel",
                  style: "cancel",
                },
              ],
            );

            return false;
          }

          permission = requestedPermission;
        } else {
          Alert.alert(
            "Location Access Required",
            "Location permission has been disabled for this app. Please enable it from your device Settings to continue.",
            [
              {
                text: "Cancel",
                style: "cancel",
              },
              {
                text: "OK",
                style: "default",
              },
            ],
          );

          return false;
        }
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const currentLatitude = currentLocation.coords.latitude;
      const currentLongitude = currentLocation.coords.longitude;

      setLatitude(currentLatitude);
      setLongitude(currentLongitude);

      setErrors((prev) => ({
        ...prev,
        location: "",
      }));

      console.log("Current Location:", currentLatitude, currentLongitude);

      // Fetch address automatically from Ola Maps
      await fetchAddressFromCoordinates(currentLatitude, currentLongitude);

      return true;
    } catch (error) {
      console.log("Location unavailable:", error);

      Alert.alert(
        "Location Unavailable",
        "We couldn't determine your current location. Please make sure Location Services are enabled on your device and try again.",
        [
          {
            text: "OK",
            style: "default",
          },
        ],
      );

      return false;
    }
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    // Step 2 -> Step 3
    if (currentStep === 2) {
      const locationSuccess = await getCurrentLocation();

      if (!locationSuccess) {
        return;
      }
      setCurrentStep(3);
      setErrors({});
      return;
    }

    // Step 1 -> Step 2
    if (currentStep === 1) {
      setCurrentStep(2);
      setErrors({});
      return;
    }

    // Step 3 -> Step 4
    if (currentStep === 3) {
      setCurrentStep(4);
      setErrors({});
      return;
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const mobile = mobileNumber.trim();

      // Check existing partner/salon
      const statusResponse = await fetch(
        `${API_URL}/api/salons/partner/${mobile}`,
      );

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const existingSalon = statusData?.salon;

        // If existing application is rejected,
        // update the same salon instead of creating a new one.
        if (existingSalon?.status === "REJECTED") {
          const response = await fetch(
            `${API_URL}/api/salons/partner/${mobile}/resubmit`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                mobile,
                name: salonName.trim(),
                ownerName: ownerName.trim(),
                email: email.trim(),
                category: selectedCategory,
                address: address.trim(),
                city: city.trim(),
                state: state.trim(),
                pincode: pincode.trim(),
                image: salonImage,
                aadhaarNumber: aadhaarNumber.trim(),
                aadhaarDocument,
                panNumber: panNumber.trim(),
                panDocument,
                latitude,
                longitude,
              }),
            },
          );

          const data = await response.json();

          if (!response.ok) {
            setErrors((prev) => ({
              ...prev,
              submit: data?.message || "Resubmission failed",
            }));
            return;
          }

          router.push("/partner/verification" as any);
          return;
        }
      }

      // Normal new registration
      const response = await fetch(`${API_URL}/api/salons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile,
          name: salonName.trim(),
          ownerName: ownerName.trim(),
          email: email.trim(),
          category: selectedCategory,
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          image: salonImage,
          aadhaarNumber: aadhaarNumber.trim(),
          aadhaarDocument,
          panNumber: panNumber.trim(),
          panDocument,
          latitude,
          longitude,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors((prev) => ({
          ...prev,
          submit: data?.message || "Registration failed",
        }));
        return;
      }

      router.push("/partner/verification" as any);
    } catch (error) {
      console.error("Registration Error:", error);

      setErrors((prev) => ({
        ...prev,
        submit: "Unable to connect to server",
      }));
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
            <Text style={styles.title}>Partner Registration</Text>
            <Text style={styles.subtitle}>
              Register your salon and submit KYC
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <Text style={styles.progressTitle}>Registration & KYC</Text>
            <Text style={styles.progressCount}>Step {currentStep} of 4</Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${currentStep * 25}%` }]}
            />
          </View>
        </View>

        {currentStep === 1 && (
          <>
            {/* Salon Details */}
            <Text style={styles.sectionTitle}>Salon Details</Text>

            <View style={styles.card}>
              <Text style={styles.label}>
                Salon Name <Text style={styles.required}>*</Text>
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Enter salon name"
                placeholderTextColor="#999"
                value={salonName}
                onChangeText={(value) => {
                  setSalonName(value);
                  validateField("salonName", value);
                }}
              />
              {errors.salonName ? (
                <Text style={styles.textFieldError}>{errors.salonName}</Text>
              ) : null}

              <Text style={styles.label}>
                Owner Name <Text style={styles.required}>*</Text>
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Enter owner name"
                placeholderTextColor="#999"
                value={ownerName}
                onChangeText={(value) => {
                  setOwnerName(value);
                  validateField("ownerName", value);
                }}
              />
              {errors.ownerName ? (
                <Text style={styles.textFieldError}>{errors.ownerName}</Text>
              ) : null}

              <Text style={styles.label}>
                Email Address <Text style={styles.required}>*</Text>
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Enter email address"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  validateField("email", value);
                }}
              />
              {errors.email ? (
                <Text style={styles.textFieldError}>{errors.email}</Text>
              ) : null}
            </View>
          </>
        )}

        {currentStep === 2 && (
          <>
            {/* Salon Image */}
            <Text style={styles.sectionTitle}>Salon Image</Text>

            <View style={styles.card}>
              <Text style={styles.label}>
                Upload Salon Image <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.salonImageBox}
                activeOpacity={0.7}
                onPress={pickSalonImage}
              >
                {salonImage ? (
                  <Image
                    source={{ uri: salonImage }}
                    style={styles.salonImagePreview}
                  />
                ) : (
                  <>
                    <Text style={styles.uploadIcon}>＋</Text>
                    <Text style={styles.uploadTitle}>Choose Salon Image</Text>
                    <Text style={styles.uploadSubtext}>JPG or PNG</Text>
                  </>
                )}
              </TouchableOpacity>
              {errors.salonImage ? (
                <Text style={styles.fieldError}>{errors.salonImage}</Text>
              ) : null}
              {salonImage && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={pickSalonImage}
                  style={styles.changeImageButton}
                >
                  <Text style={styles.changeImageText}>Change Image</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Salon Category */}
            <Text style={styles.sectionTitle}>Salon Category</Text>

            <View style={styles.card}>
              <Text style={styles.label}>Select Salon Type</Text>

              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  selectedCategory === "Men's Salon" &&
                    styles.categoryOptionSelected,
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedCategory("Men's Salon");
                  setErrors((prev) => ({ ...prev, category: "" }));
                }}
              >
                <View
                  style={[
                    styles.radioOuter,
                    selectedCategory === "Men's Salon" &&
                      styles.radioOuterSelected,
                  ]}
                >
                  {selectedCategory === "Men's Salon" && (
                    <View style={styles.radioInner} />
                  )}
                </View>

                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === "Men's Salon" &&
                      styles.categoryTextSelected,
                  ]}
                >
                  Men's Salon
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  selectedCategory === "Beauty Parlour" &&
                    styles.categoryOptionSelected,
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedCategory("Beauty Parlour");
                  setErrors((prev) => ({ ...prev, category: "" }));
                }}
              >
                <View
                  style={[
                    styles.radioOuter,
                    selectedCategory === "Beauty Parlour" &&
                      styles.radioOuterSelected,
                  ]}
                >
                  {selectedCategory === "Beauty Parlour" && (
                    <View style={styles.radioInner} />
                  )}
                </View>

                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === "Beauty Parlour" &&
                      styles.categoryTextSelected,
                  ]}
                >
                  Beauty Parlour
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryOption,
                  selectedCategory === "Unisex Salon" &&
                    styles.categoryOptionSelected,
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedCategory("Unisex Salon");
                  setErrors((prev) => ({ ...prev, category: "" }));
                }}
              >
                <View
                  style={[
                    styles.radioOuter,
                    selectedCategory === "Unisex Salon" &&
                      styles.radioOuterSelected,
                  ]}
                >
                  {selectedCategory === "Unisex Salon" && (
                    <View style={styles.radioInner} />
                  )}
                </View>

                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === "Unisex Salon" &&
                      styles.categoryTextSelected,
                  ]}
                >
                  Unisex Salon
                </Text>
              </TouchableOpacity>

              {errors.category ? (
                <Text style={styles.sectionError}>{errors.category}</Text>
              ) : null}
            </View>
          </>
        )}

        {currentStep === 3 && (
          <>
            {/* Salon Address */}
            <Text style={styles.sectionTitle}>Salon Address</Text>

            <View style={styles.card}>
              <Text style={styles.label}>
                Address <Text style={styles.required}>*</Text>
              </Text>

              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Enter salon address"
                placeholderTextColor="#999"
                multiline
                value={address}
                onChangeText={(value) => {
                  setAddress(value);
                  validateField("address", value);
                }}
              />
              {errors.address ? (
                <Text style={styles.textFieldError}>{errors.address}</Text>
              ) : null}

              <Text style={styles.label}>
                City <Text style={styles.required}>*</Text>
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Enter city"
                placeholderTextColor="#999"
                value={city}
                onChangeText={(value) => {
                  setCity(value);
                  validateField("city", value);
                }}
              />
              {errors.city ? (
                <Text style={styles.textFieldError}>{errors.city}</Text>
              ) : null}

              <Text style={styles.label}>
                State <Text style={styles.required}>*</Text>
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Enter state"
                placeholderTextColor="#999"
                value={state}
                onChangeText={(value) => {
                  setState(value);
                  validateField("state", value);
                }}
              />
              {errors.state ? (
                <Text style={styles.textFieldError}>{errors.state}</Text>
              ) : null}

              <Text style={styles.label}>
                Pincode <Text style={styles.required}>*</Text>
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Enter pincode"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={6}
                value={pincode}
                onChangeText={(value) => {
                  const cleaned = value.replace(/\D/g, "").slice(0, 6);
                  setPincode(cleaned);
                  validateField("pincode", cleaned);
                }}
              />
              {errors.pincode ? (
                <Text style={styles.textFieldError}>{errors.pincode}</Text>
              ) : null}
            </View>
          </>
        )}

        {currentStep === 4 && (
          <>
            {/* KYC */}
            <Text style={styles.sectionTitle}>KYC Details</Text>

            <View style={styles.card}>
              {/* Aadhaar Card */}
              <Text style={styles.label}>
                Aadhaar Card Number <Text style={styles.required}>*</Text>
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Enter 12-digit Aadhaar number"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={12}
                value={aadhaarNumber}
                onChangeText={(value) => {
                  const cleaned = value.replace(/\D/g, "").slice(0, 12);
                  setAadhaarNumber(cleaned);
                  validateField("aadhaarNumber", cleaned);
                }}
              />
              {errors.aadhaarNumber ? (
                <Text style={styles.textFieldError}>
                  {errors.aadhaarNumber}
                </Text>
              ) : null}

              <TouchableOpacity
                style={styles.uploadBox}
                activeOpacity={0.7}
                onPress={() => pickDocument("aadhaar")}
              >
                <Text style={styles.uploadIcon}>＋</Text>
                <Text style={styles.uploadTitle}>
                  {aadhaarDocument
                    ? "Aadhaar Card Selected"
                    : "Upload Aadhaar Card"}
                </Text>
                <Text style={styles.uploadSubtext}>
                  {aadhaarDocument
                    ? "Tap to change document"
                    : "JPG, PNG or PDF"}
                </Text>
              </TouchableOpacity>
              {errors.aadhaarDocument ? (
                <Text style={styles.fieldError}>{errors.aadhaarDocument}</Text>
              ) : null}

              {/* PAN Card */}
              <Text style={[styles.label, styles.panLabel]}>
                PAN Card Number <Text style={styles.required}>*</Text>
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Enter PAN card number"
                placeholderTextColor="#999"
                autoCapitalize="characters"
                maxLength={10}
                value={panNumber}
                onChangeText={(value) => {
                  const cleaned = value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 10);

                  setPanNumber(cleaned);
                  validateField("panNumber", cleaned);
                }}
              />
              {errors.panNumber ? (
                <Text style={styles.textFieldError}>{errors.panNumber}</Text>
              ) : null}

              <TouchableOpacity
                style={styles.uploadBox}
                activeOpacity={0.7}
                onPress={() => pickDocument("pan")}
              >
                <Text style={styles.uploadIcon}>＋</Text>
                <Text style={styles.uploadTitle}>
                  {panDocument ? "PAN Card Selected" : "Upload PAN Card"}
                </Text>
                <Text style={styles.uploadSubtext}>
                  {panDocument ? "Tap to change document" : "JPG, PNG or PDF"}
                </Text>
              </TouchableOpacity>
              {errors.panDocument ? (
                <Text style={styles.fieldError}>{errors.panDocument}</Text>
              ) : null}
            </View>
          </>
        )}

        {/* Navigation / Submit */}
        {Object.keys(errors).length > 0 && (
          <Text style={styles.formErrorText}>
            {errors.submit || "Please fill all required fields correctly."}
          </Text>
        )}

        <View style={styles.navigationRow}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.8}
              onPress={handleBack}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          {currentStep < 4 ? (
            <TouchableOpacity
              style={[
                styles.nextButton,
                currentStep === 1 && styles.nextButtonFull,
              ]}
              activeOpacity={0.8}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.nextButton}
              activeOpacity={0.8}
              onPress={handleSubmit}
            >
              <Text style={styles.nextButtonText}>Submit for Verification</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.bottomText}>
          Your details will be reviewed by the admin before approval.
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

  header: {
    marginBottom: 22,
    alignItems: "center",
    paddingTop: 20,
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

  progressCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
  },

  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#25202F",
  },

  progressCount: {
    fontSize: 11,
    color: "#777",
  },

  progressTrack: {
    height: 6,
    backgroundColor: "#E9E5F0",
    borderRadius: 5,
    marginTop: 12,
    overflow: "hidden",
  },

  progressFill: {
    width: "100%",
    height: "100%",
    backgroundColor: "#5B3CC4",
    borderRadius: 5,
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

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#25202F",
    marginBottom: 8,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E1DFE7",
    borderRadius: 12,
    backgroundColor: "#FAFAFC",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#191522",
    marginBottom: 17,
  },

  multilineInput: {
    height: 85,
    paddingTop: 13,
    textAlignVertical: "top",
  },

  categoryOption: {
    height: 52,
    borderWidth: 1,
    borderColor: "#E1DFE7",
    borderRadius: 12,
    backgroundColor: "#FAFAFC",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  categoryOptionSelected: {
    borderColor: "#5B3CC4",
    backgroundColor: "#F6F2FF",
  },

  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#B8B5C0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  radioOuterSelected: {
    borderColor: "#5B3CC4",
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#5B3CC4",
  },

  categoryText: {
    fontSize: 14,
    color: "#444",
    fontWeight: "500",
  },

  categoryTextSelected: {
    color: "#5B3CC4",
    fontWeight: "700",
  },

  salonImageBox: {
    height: 180,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CFC6E4",
    borderRadius: 14,
    backgroundColor: "#FAF8FF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  salonImagePreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  changeImageButton: {
    alignItems: "center",
    marginTop: 10,
  },

  changeImageText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5B3CC4",
  },

  documentSelector: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E1DFE7",
    borderRadius: 12,
    backgroundColor: "#FAFAFC",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
  },

  documentText: {
    fontSize: 14,
    color: "#888",
  },

  arrowContainer: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  arrowDown: {
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#777",
    transform: [{ rotate: "45deg" }],
    marginTop: -4,
  },

  panLabel: {
    marginTop: 20,
  },

  uploadBox: {
    height: 110,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CFC6E4",
    borderRadius: 14,
    backgroundColor: "#FAF8FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  uploadIcon: {
    fontSize: 28,
    color: "#5B3CC4",
    fontWeight: "300",
  },

  uploadTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5B3CC4",
    marginTop: 3,
  },

  uploadSubtext: {
    fontSize: 10,
    color: "#999",
    marginTop: 3,
  },

  textFieldError: {
    color: "#D93025",
    fontSize: 11,
    marginTop: -11,
    marginBottom: 10,
    marginHorizontal: 2,
  },

  fieldError: {
    color: "#D93025",
    fontSize: 11,
    marginTop: 4,
    marginBottom: 6,
    marginHorizontal: 2,
  },

  errorText: {
    color: "#D93025",
    fontSize: 11,
    marginTop: 4,
    marginBottom: 8,
    marginHorizontal: 2,
  },

  sectionError: {
    color: "#D93025",
    fontSize: 11,
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 0,
  },

  required: {
    color: "#D93025",
  },

  formErrorText: {
    color: "#D93025",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginHorizontal: 20,
    marginTop: 20,
  },

  submitButton: {
    height: 55,
    marginHorizontal: 20,
    marginTop: 25,
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

  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  navigationRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 25,
    gap: 10,
  },

  backButton: {
    flex: 1,
    height: 55,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#5B3CC4",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonText: {
    color: "#5B3CC4",
    fontSize: 15,
    fontWeight: "700",
  },

  nextButton: {
    flex: 1,
    height: 55,
    borderRadius: 14,
    backgroundColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
  },

  nextButtonFull: {
    flex: 1,
  },

  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  bottomText: {
    textAlign: "center",
    fontSize: 11,
    color: "#888",
    marginHorizontal: 35,
    marginTop: 12,
    lineHeight: 17,
  },
  mapCard: {
    marginHorizontal: 20,
    marginBottom: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 15,
  },

  mapTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#191522",
  },

  mapSubtitle: {
    fontSize: 11,
    color: "#777",
    marginTop: 4,
    marginBottom: 12,
  },

  map: {
    width: "100%",
    height: 260,
    borderRadius: 14,
  },

  coordinatesBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#F6F2FF",
  },

  coordinatesText: {
    fontSize: 11,
    color: "#5B3CC4",
    fontWeight: "600",
    marginBottom: 2,
  },
});
