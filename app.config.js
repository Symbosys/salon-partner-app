module.exports = ({ config }) => ({
  ...config,

  plugins: [
    [
      "react-native-maps",
      {
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    ],
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#208AEF",
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
      },
    ],
    "@react-native-community/datetimepicker",
  ],

  extra: {
    ...config.extra,
    googleMapsWebApiKey: process.env.GOOGLE_MAPS_API_KEY,
  },
});
