import React, { createContext, useContext, useState, useEffect } from "react";
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	signOut,
	onAuthStateChanged,
	updateProfile,
	User as FirebaseUser,
	signInWithPhoneNumber,
	PhoneAuthProvider,
	signInWithCredential,
} from "firebase/auth";
import {
	doc,
	setDoc,
	getDoc,
	collection,
	query,
	where,
	getDocs,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";

interface User {
	id: string;
	username: string;
	phoneNumber: string;
	email: string;
	createdAt?: Date;
}

interface AuthContextType {
	user: User | null;
	firebaseUser: FirebaseUser | null;
	login: (
		username: string,
		password: string
	) => Promise<{ success: boolean; error?: string }>;
	sendVerificationCode: (
		username: string,
		phoneNumber: string,
		password: string,
		recaptchaVerifier: any
	) => Promise<{ success: boolean; verificationId?: string; error?: string }>;
	verifyCode: (
		verificationId: string,
		code: string,
		username: string,
		phoneNumber: string,
		password: string
	) => Promise<{ success: boolean; error?: string }>;
	logout: () => Promise<void>;
	loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				setFirebaseUser(firebaseUser);
				// Get additional user data from Firestore
				try {
					const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
					if (userDoc.exists()) {
						const userData = userDoc.data();
						setUser({
							id: firebaseUser.uid,
							username: userData.username || firebaseUser.displayName || "User",
							phoneNumber: userData.phoneNumber || "",
							email: firebaseUser.email || "",
							createdAt: userData.createdAt?.toDate(),
						});
					} else {
						// Fallback for users created before Firestore integration
						setUser({
							id: firebaseUser.uid,
							username: firebaseUser.displayName || "User",
							phoneNumber: "",
							email: firebaseUser.email || "",
						});
					}
				} catch (error) {
					console.error("Error fetching user data:", error);
					// Fallback user data
					setUser({
						id: firebaseUser.uid,
						username: firebaseUser.displayName || "User",
						phoneNumber: "",
						email: firebaseUser.email || "",
					});
				}
			} else {
				setFirebaseUser(null);
				setUser(null);
			}
			setLoading(false);
		});

		return unsubscribe;
	}, []);

	const sendVerificationCode = async (
		username: string,
		phoneNumber: string,
		password: string,
		recaptchaVerifier: any
	) => {
		try {
			// Format phone number (ensure it starts with country code)
			const formattedPhone = phoneNumber.startsWith("+")
				? phoneNumber
				: `+1${phoneNumber}`;

			console.log(`Sending SMS to ${formattedPhone} for user ${username}...`);

			// Send verification code using Firebase Phone Auth
			const confirmationResult = await signInWithPhoneNumber(
				auth,
				formattedPhone,
				recaptchaVerifier
			);

			console.log("SMS sent successfully!");

			return {
				success: true,
				verificationId: confirmationResult.verificationId,
			};
		} catch (error: any) {
			// Only log unexpected verification errors
			const isExpectedError = [
				"auth/invalid-phone-number",
				"auth/missing-phone-number",
				"auth/quota-exceeded",
				"auth/captcha-check-failed",
				"auth/too-many-requests",
			].includes(error.code);

			if (!isExpectedError) {
				console.error("Unexpected SMS verification error:", error);
			}

			return {
				success: false,
				error: getErrorMessage(error.code),
			};
		}
	};

	const verifyCode = async (
		verificationId: string,
		code: string,
		username: string,
		phoneNumber: string,
		password: string
	) => {
		try {
			setLoading(true);

			console.log("Verifying SMS code...");

			// Create credential with verification code
			const credential = PhoneAuthProvider.credential(verificationId, code);

			// Sign in with the credential to verify phone ownership
			const phoneUserCredential = await signInWithCredential(auth, credential);

			// Phone verification successful, now we need to sign out and create email/password account
			await signOut(auth);

			console.log(
				"Phone verification successful! Creating email/password account..."
			);

			// Create email from username for Firebase Auth
			const email = `${username.toLowerCase()}@zeitgeist.local`;

			// Create user with Firebase Auth using email/password
			const userCredential = await createUserWithEmailAndPassword(
				auth,
				email,
				password
			);
			const firebaseUser = userCredential.user;

			// Update display name
			await updateProfile(firebaseUser, { displayName: username });

			// Save user data to Firestore (including verified phone number)
			const userData = {
				username: username.toLowerCase(),
				phoneNumber,
				email,
				createdAt: new Date(),
				phoneVerified: true,
			};

			await setDoc(doc(db, "users", firebaseUser.uid), userData);

			console.log("Account created successfully!");

			return { success: true };
		} catch (error: any) {
			// Only log unexpected verification errors
			const isExpectedError = [
				"auth/invalid-verification-code",
				"auth/code-expired",
				"auth/email-already-in-use",
			].includes(error.code);

			if (!isExpectedError) {
				console.error("Unexpected account creation error:", error);
			}

			if (error.code === "auth/email-already-in-use") {
				return {
					success: false,
					error: "Username is already taken. Please choose a different one.",
				};
			}

			return {
				success: false,
				error: getErrorMessage(error.code),
			};
		} finally {
			setLoading(false);
		}
	};

	const login = async (username: string, password: string) => {
		try {
			setLoading(true);

			// Convert username to email format for Firebase Auth
			const email = `${username.toLowerCase()}@zeitgeist.local`;

			await signInWithEmailAndPassword(auth, email, password);
			return { success: true };
		} catch (error: any) {
			// Only log unexpected errors, not normal authentication failures
			const isExpectedError = [
				"auth/user-not-found",
				"auth/wrong-password",
				"auth/invalid-email",
				"auth/invalid-credential",
			].includes(error.code);

			if (!isExpectedError) {
				console.error("Unexpected login error:", error);
			}

			// Handle specific authentication errors
			switch (error.code) {
				case "auth/user-not-found":
					return {
						success: false,
						error:
							"Username not found. Please check your username or create an account.",
					};
				case "auth/wrong-password":
				case "auth/invalid-credential":
					return {
						success: false,
						error: "Incorrect username or password. Please try again.",
					};
				case "auth/invalid-email":
					return {
						success: false,
						error: "Invalid username format. Please check your username.",
					};
				case "auth/user-disabled":
					return {
						success: false,
						error: "Your account has been disabled. Please contact support.",
					};
				case "auth/too-many-requests":
					return {
						success: false,
						error:
							"Too many failed login attempts. Please try again later or reset your password.",
					};
				case "auth/network-request-failed":
					return {
						success: false,
						error:
							"Network error. Please check your internet connection and try again.",
					};
				case "auth/internal-error":
					return {
						success: false,
						error: "Internal error occurred. Please try again later.",
					};
				default:
					// Log unexpected error codes
					console.error(
						"Unknown authentication error:",
						error.code,
						error.message
					);
					return {
						success: false,
						error:
							getErrorMessage(error.code) ||
							"Login failed. Please check your credentials and try again.",
					};
			}
		} finally {
			setLoading(false);
		}
	};

	const logout = async () => {
		try {
			await signOut(auth);
		} catch (error) {
			console.error("Logout error:", error);
		}
	};

	const getErrorMessage = (errorCode: string): string => {
		switch (errorCode) {
			case "auth/user-not-found":
				return "Username not found. Please check your username.";
			case "auth/wrong-password":
			case "auth/invalid-credential":
				return "Incorrect username or password.";
			case "auth/email-already-in-use":
				return "Username is already taken.";
			case "auth/weak-password":
				return "Password should be at least 6 characters.";
			case "auth/invalid-phone-number":
				return "Invalid phone number format.";
			case "auth/missing-phone-number":
				return "Phone number is required.";
			case "auth/quota-exceeded":
				return "SMS quota exceeded. Please try again later.";
			case "auth/invalid-verification-code":
				return "Invalid verification code.";
			case "auth/code-expired":
				return "Verification code has expired.";
			case "auth/too-many-requests":
				return "Too many requests. Please try again later.";
			case "auth/captcha-check-failed":
				return "reCAPTCHA verification failed. Please try again.";
			default:
				return "An error occurred. Please try again.";
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				firebaseUser,
				login,
				sendVerificationCode,
				verifyCode,
				logout,
				loading,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
