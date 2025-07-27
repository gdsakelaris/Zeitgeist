import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Firebase configuration from environment variables for security
const firebaseConfig = {
	apiKey:
		process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
		"AIzaSyBP1OKlNk6gz9ghS7XL3k3g0abdzqGw62g",
	authDomain:
		process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
		"zeitgeist-b8e66.firebaseapp.com",
	projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "zeitgeist-b8e66",
	storageBucket:
		process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
		"zeitgeist-b8e66.firebasestorage.app",
	messagingSenderId:
		process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "754440642729",
	appId:
		process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
		"1:754440642729:web:fe2953186d515162ac89b8",
	measurementId:
		process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-96X9NRF5VZ",
};

// Validate configuration
const requiredKeys = ["apiKey", "authDomain", "projectId"];
const missingKeys = requiredKeys.filter(
	(key) => !firebaseConfig[key as keyof typeof firebaseConfig]
);

if (missingKeys.length > 0) {
	throw new Error(`Missing Firebase configuration: ${missingKeys.join(", ")}`);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication with AsyncStorage persistence
export const auth = initializeAuth(app, {
	persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
