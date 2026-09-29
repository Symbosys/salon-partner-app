import { API_URL } from "@/constants/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PartnerLoginScreen() {
  const router = useRouter();
  const otpRefs = useRef<Array<TextInput | null>>([]);

  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);

  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  const [mobileError, setMobileError] = useState("");
  const [otpError, setOtpError] = useState("");

  // =========================
  // SEND OTP
  // =========================
  const handleSendOtp = async () => {
    setMobileError("");
    setOtpError("");

    const mobile = mobileNumber.trim();

    if (!/^\d{10}$/.test(mobile)) {
      setMobileError("Please enter a valid 10-digit mobile number");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/salons/partner/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMobileError(data?.message || "Unable to send OTP");
        return;
      }

      setShowOtp(true);

      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 200);
    } catch (error) {
      console.error("Send OTP Error:", error);
      setMobileError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // OTP INPUT
  // =========================
  const handleOtpChange = (value: string, index: number) => {
    const digit = value.replace(/\D/g, "").slice(-1);

    const updatedOtp = [...otp];
    updatedOtp[index] = digit;

    setOtp(updatedOtp);
    setOtpError("");

    if (digit && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (event: any, index: number) => {
    if (event.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const checkRegisteredPartner = async (mobile: string) => {
    try {
      const response = await fetch(`${API_URL}/api/salons/partner/${mobile}`);

      const data = await response.json();

      console.log("Partner Registration Check:", response.status, data);

      // Partner registered nahi hai
      if (!response.ok || data?.registered !== true) {
        router.replace("/partner/registration" as any);
        return;
      }

      const salon = data?.salon;

      // Application rejected
      if (salon?.status === "REJECTED") {
        router.replace("/partner/registration" as any);
        return;
      }

      // Application pending
      if (salon?.status === "PENDING") {
        router.replace("/partner/verification" as any);
        return;
      }

      // Application approved
      if (salon?.status === "APPROVED") {
        router.replace("/(tabs)" as any);
        return;
      }

      // Unknown status
      router.replace("/partner/registration" as any);
    } catch (error) {
      console.error("Check Registered Partner Error:", error);
      setOtpError("Unable to check registration. Please try again.");
    }
  };

  // =========================
  // VERIFY OTP
  // =========================
  const handleVerifyOtp = async () => {
    setOtpError("");

    const enteredOtp = otp.join("");

    if (enteredOtp.length !== 4) {
      setOtpError("Please enter the complete 4-digit OTP");
      return;
    }

    try {
      setLoading(true);

      const mobile = mobileNumber.trim();

      const response = await fetch(`${API_URL}/api/salons/partner/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile,
          otp: enteredOtp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpError(data?.message || "Invalid OTP");
        return;
      }

      await AsyncStorage.setItem("partnerMobile", mobile);
      await checkRegisteredPartner(mobile);
    } catch (error) {
      console.error("Verify OTP Error:", error);
      setOtpError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // CHANGE NUMBER
  // =========================
  const handleChangeNumber = () => {
    setShowOtp(false);
    setOtp(["", "", "", ""]);
    setOtpError("");
    setMobileError("");

    setTimeout(() => {
      otpRefs.current[0]?.blur();
    }, 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.main}>
              <View style={styles.header}>
                <View style={styles.brandRow}>
                  <View style={styles.logo}>
                    <Text style={styles.logoText}>S</Text>
                  </View>

                  <View>
                    <Text style={styles.brandName}>SalonApp</Text>
                    <Text style={styles.brandSubtext}>Partner Portal</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.title}>
                {showOtp ? "Verify your number" : "Welcome back"}
              </Text>
              <Text style={styles.subtitle}>
                {showOtp
                  ? "Enter the verification code sent to your mobile number."
                  : "Login to manage your salon, bookings and appointments."}
              </Text>

              {/* =========================
                  LOGIN CARD
              ========================= */}
              <View style={styles.card}>
                {/* STEP INDICATOR */}
                <View style={styles.steps}>
                  <View style={styles.stepItem}>
                    <View style={[styles.stepCircle, styles.stepActive]}>
                      <Text style={styles.stepActiveText}>1</Text>
                    </View>

                    <Text style={[styles.stepText, styles.stepTextActive]}>
                      Mobile
                    </Text>
                  </View>

                  <View
                    style={[styles.stepLine, showOtp && styles.stepLineActive]}
                  />

                  <View style={styles.stepItem}>
                    <View
                      style={[styles.stepCircle, showOtp && styles.stepActive]}
                    >
                      <Text
                        style={[
                          styles.stepInactiveText,
                          showOtp && styles.stepActiveText,
                        ]}
                      >
                        2
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.stepText,
                        showOtp && styles.stepTextActive,
                      ]}
                    >
                      OTP
                    </Text>
                  </View>
                </View>

                {/* =========================
                    MOBILE
                ========================= */}
                <Text style={styles.label}>Mobile Number</Text>

                <View
                  style={[styles.mobileBox, mobileError && styles.errorBorder]}
                >
                  <View style={styles.countryBox}>
                    <Text style={styles.flag}>🇮🇳</Text>

                    <Text style={styles.countryCode}>+91</Text>
                  </View>

                  <TextInput
                    style={styles.mobileInput}
                    placeholder="Enter 10-digit mobile number"
                    placeholderTextColor="#A7A3AE"
                    keyboardType="number-pad"
                    maxLength={10}
                    editable={!showOtp}
                    value={mobileNumber}
                    onChangeText={(value) => {
                      const cleaned = value.replace(/\D/g, "").slice(0, 10);

                      setMobileNumber(cleaned);
                      setMobileError("");
                    }}
                  />
                </View>

                {mobileError ? (
                  <Text style={styles.errorText}>{mobileError}</Text>
                ) : null}

                {/* =========================
                    SEND OTP
                ========================= */}
                {!showOtp && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[
                      styles.button,
                      mobileNumber.length !== 10 && styles.buttonDisabled,
                    ]}
                    disabled={mobileNumber.length !== 10 || loading}
                    onPress={handleSendOtp}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buttonText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                )}

                {/* =========================
                    OTP
                ========================= */}
                {showOtp && (
                  <View style={styles.otpSection}>
                    <View style={styles.otpInfo}>
                      <Text style={styles.label}>Enter OTP</Text>

                      <Text style={styles.sentText}>OTP sent</Text>
                    </View>

                    <Text style={styles.otpDescription}>
                      We've sent a 4-digit code to{" "}
                      <Text style={styles.mobileBold}>+91 {mobileNumber}</Text>
                    </Text>

                    {/* OTP BOXES */}
                    <View style={styles.otpRow}>
                      {otp.map((digit, index) => (
                        <TextInput
                          key={index}
                          ref={(ref) => {
                            otpRefs.current[index] = ref;
                          }}
                          style={[
                            styles.otpBox,
                            digit && styles.otpBoxFilled,
                            otpError && styles.errorBorder,
                          ]}
                          value={digit}
                          maxLength={1}
                          keyboardType="number-pad"
                          textAlign="center"
                          onChangeText={(value) =>
                            handleOtpChange(value, index)
                          }
                          onKeyPress={(event) =>
                            handleOtpKeyPress(event, index)
                          }
                          selectTextOnFocus
                        />
                      ))}
                    </View>

                    {otpError ? (
                      <Text style={styles.errorText}>{otpError}</Text>
                    ) : null}

                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[
                        styles.button,
                        otp.join("").length !== 4 && styles.buttonDisabled,
                      ]}
                      disabled={otp.join("").length !== 4 || loading}
                      onPress={handleVerifyOtp}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.buttonText}>Verify & Continue</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={handleChangeNumber}
                      style={styles.changeButton}
                    >
                      <Text style={styles.changeText}>
                        ← Change mobile number
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* =========================
                FOOTER
            ========================= */}
            <View style={styles.footer}>
              <Text style={styles.lockIcon}>🔒</Text>

              <Text style={styles.footerText}>
                Secure & encrypted partner login
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F5FB",
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // =========================
  // HEADER
  // =========================

  header: {
    paddingTop: 14,
    alignItems: "center",
    marginBottom: 25,
  },

  brandRow: {
    alignItems: "center",
  },

  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
  },

  logoText: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
  },

  brandName: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "800",
    color: "#211C2B",
    textAlign: "center",
  },

  brandSubtext: {
    marginTop: 1,
    fontSize: 10,
    color: "#918C99",
    fontWeight: "600",
    textAlign: "center",
  },
  // =========================
  // MAIN
  // =========================

  main: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 25,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#201B29",
    letterSpacing: -0.5,
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    maxWidth: 350,
    fontSize: 13,
    lineHeight: 20,
    color: "#85808D",
  },

  // =========================
  // CARD
  // =========================

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EAE6F0",
  },

  // =========================
  // STEPS
  // =========================

  steps: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
    paddingHorizontal: 4,
  },

  stepItem: {
    alignItems: "center",
    minWidth: 48,
  },

  stepCircle: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: "#EEEAF3",
    alignItems: "center",
    justifyContent: "center",
  },

  stepActive: {
    backgroundColor: "#5B3CC4",
  },

  stepActiveText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  stepInactiveText: {
    color: "#8D8895",
    fontSize: 11,
    fontWeight: "800",
  },

  stepText: {
    marginTop: 5,
    fontSize: 9,
    fontWeight: "600",
    color: "#9B96A2",
  },

  stepTextActive: {
    color: "#5B3CC4",
    fontWeight: "800",
  },

  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E7E3EC",
    marginHorizontal: 7,
    marginBottom: 17,
  },

  stepLineActive: {
    backgroundColor: "#5B3CC4",
  },

  // =========================
  // LABEL
  // =========================

  label: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2A2533",
    marginBottom: 9,
  },

  // =========================
  // MOBILE INPUT
  // =========================

  mobileBox: {
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FBFAFD",
    borderWidth: 1,
    borderColor: "#DED9E6",
    borderRadius: 13,
  },

  errorBorder: {
    borderColor: "#D84B4B",
  },

  countryBox: {
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: "#DDD8E5",
  },

  flag: {
    fontSize: 16,
    marginRight: 5,
  },

  countryCode: {
    fontSize: 13,
    fontWeight: "800",
    color: "#37313F",
  },

  mobileInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#211D29",
  },

  errorText: {
    marginTop: 6,
    fontSize: 11,
    color: "#D64545",
    fontWeight: "600",
  },

  // =========================
  // BUTTON
  // =========================

  button: {
    height: 54,
    borderRadius: 13,
    backgroundColor: "#5B3CC4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 19,
  },

  buttonDisabled: {
    opacity: 0.4,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  // =========================
  // OTP
  // =========================

  otpSection: {
    marginTop: 30,
  },

  otpInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sentText: {
    fontSize: 10,
    color: "#39945C",
    fontWeight: "800",
    marginBottom: 9,
  },

  otpDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: "#85808D",
    marginBottom: 17,
  },

  mobileBold: {
    color: "#332D3B",
    fontWeight: "800",
  },

  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  otpBox: {
    width: 56,
    height: 58,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DED9E6",
    backgroundColor: "#FBFAFD",
    fontSize: 22,
    fontWeight: "800",
    color: "#27212F",
  },

  otpBoxFilled: {
    borderColor: "#5B3CC4",
    backgroundColor: "#F8F5FF",
  },

  changeButton: {
    alignItems: "center",
    marginTop: 18,
  },

  changeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5B3CC4",
  },

  // =========================
  // FOOTER
  // =========================

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 12,
  },

  lockIcon: {
    fontSize: 10,
    marginRight: 5,
  },

  footerText: {
    fontSize: 9,
    color: "#9B96A2",
    fontWeight: "600",
  },
});
