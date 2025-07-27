import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration from your Firebase console
const firebaseConfig = {
	apiKey: "AIzaSyBP1OKlNk6gz9ghS7XL3k3g0abdzqGw62g",
	authDomain: "zeitgeist-b8e66.firebaseapp.com",
	projectId: "zeitgeist-b8e66",
	storageBucket: "zeitgeist-b8e66.firebasestorage.app",
	messagingSenderId: "754440642729",
	appId: "1:754440642729:web:fe2953186d515162ac89b8",
	measurementId: "G-96X9NRF5VZ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
