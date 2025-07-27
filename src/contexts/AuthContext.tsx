import React, { createContext, useContext, useState, useEffect } from "react";
import {
	signInWithCredential,
	signOut,
	onAuthStateChanged,
	updateProfile,
	PhoneAuthProvider,
	User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

interface User {
	id: string;
	username: string;
	phoneNumber: string;
	createdAt?: Date;
}

interface AuthContextType {
	user: User | null;
	firebaseUser: FirebaseUser | null;
	sendVerificationCode: (
		phoneNumber: string
	) => Promise<{ success: boolean; verificationId?: string; error?: string }>;
	verifyCode: (
		verificationId: string,
		code: string,
		username: string
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
							phoneNumber: firebaseUser.phoneNumber || "",
							createdAt: userData.createdAt?.toDate(),
						});
					} else {
						// Fallback for users created before Firestore integration
						setUser({
							id: firebaseUser.uid,
							username: firebaseUser.displayName || "User",
							phoneNumber: firebaseUser.phoneNumber || "",
						});
					}
				} catch (error) {
					console.error("Error fetching user data:", error);
					// Fallback user data
					setUser({
						id: firebaseUser.uid,
						username: firebaseUser.displayName || "User",
						phoneNumber: firebaseUser.phoneNumber || "",
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

	const sendVerificationCode = async (phoneNumber: string) => {
		try {
			// Note: For production, you'll need to implement reCAPTCHA
			// This is a simplified version for development

			// Format phone number (ensure it starts with country code)
			const formattedPhone = phoneNumber.startsWith("+")
				? phoneNumber
				: `+1${phoneNumber}`;

			// In a real app, you'd use Firebase's phone auth provider
			// For now, we'll simulate the verification process

			// Generate a mock verification ID (in production, Firebase handles this)
			const verificationId = `verification_${Date.now()}`;

			// In production, Firebase would send the SMS
			console.log(
				`SMS would be sent to ${formattedPhone} with verification code`
			);

			return {
				success: true,
				verificationId,
			};
		} catch (error: any) {
			console.error("Error sending verification code:", error);
			return {
				success: false,
				error: getErrorMessage(error.code),
			};
		}
	};

	const verifyCode = async (
		verificationId: string,
		code: string,
		username: string
	) => {
		try {
			setLoading(true);

			// In production, you'd verify the code with Firebase
			// For development, we'll accept any 6-digit code
			if (code.length !== 6) {
				throw new Error("Invalid verification code");
			}

			// Create a mock user (in production, Firebase handles authentication)
			const mockUser = {
				uid: `user_${Date.now()}`,
				phoneNumber: "+1234567890", // This would come from the actual phone auth
				displayName: username,
			};

			// Save user data to Firestore
			const userData = {
				username,
				phoneNumber: mockUser.phoneNumber,
				createdAt: new Date(),
			};

			await setDoc(doc(db, "users", mockUser.uid), userData);

			// In production, you'd use the actual Firebase user
			setUser({
				id: mockUser.uid,
				username,
				phoneNumber: mockUser.phoneNumber,
				createdAt: new Date(),
			});

			return { success: true };
		} catch (error: any) {
			console.error("Verification error:", error);
			return {
				success: false,
				error: "Invalid verification code. Please try again.",
			};
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
			default:
				return "An error occurred. Please try again.";
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				firebaseUser,
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
