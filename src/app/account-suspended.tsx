import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

export default function AccountSuspendedScreen() {
  const handleContactSupport = () => {
    const email = "support@salonapp.com";

    const subject = "Account Suspended - Support Request";

    const body =
      "Hello Support Team,\n\nMy SalonApp partner account has been suspended. Please review my account and assist me with the issue.\n\nThank you.";

    const mailtoUrl =
      `mailto:${email}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    Linking.openURL(mailtoUrl).catch((error) => {
      console.log("Unable to open email app:", error);
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>!</Text>
      </View>

      <Text style={styles.title}>Account Suspended</Text>

      <Text style={styles.message}>
        Your partner account has been suspended by the administrator. Please
        contact support for more information.
      </Text>

      <Pressable style={styles.button} onPress={handleContactSupport}>
        <Text style={styles.buttonText}>Contact Support</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFE5E5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },

  icon: {
    fontSize: 45,
    fontWeight: "bold",
    color: "#D32F2F",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#222",
    marginBottom: 15,
  },

  message: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },

  button: {
    backgroundColor: "#000",
    paddingVertical: 14,
    paddingHorizontal: 35,
    borderRadius: 10,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
