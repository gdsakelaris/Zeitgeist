import React, { useState, useRef } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Alert,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
	ScrollView,
} from "react-native";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { initializeApp, getApps } from "firebase/app";
import { useAuth } from "../contexts/AuthContext";

// Get Firebase app instance
const firebaseApp =
	getApps().length > 0
		? getApps()[0]
		: initializeApp({
				apiKey: "AIzaSyBP1OKlNk6gz9ghS7XL3k3g0abdzqGw62g",
				authDomain: "zeitgeist-b8e66.firebaseapp.com",
				projectId: "zeitgeist-b8e66",
				storageBucket: "zeitgeist-b8e66.firebasestorage.app",
				messagingSenderId: "754440642729",
				appId: "1:754440642729:web:fe2953186d515162ac89b8",
				measurementId: "G-96X9NRF5VZ",
		  });

interface AuthScreenProps {
	navigation: {
		navigate: (screen: string, params?: any) => void;
	};
}

export default function AuthScreen({ navigation }: AuthScreenProps) {
	const [isLogin, setIsLogin] = useState(true);
	const [username, setUsername] = useState("");
	const [phoneNumber, setPhoneNumber] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [localLoading, setLocalLoading] = useState(false);
	const [failedAttempts, setFailedAttempts] = useState(0);
	const { login, sendVerificationCode, loading } = useAuth();

	// reCAPTCHA verifier ref
	const recaptchaVerifier = useRef(null);

	const formatPhoneNumber = (text: string) => {
		// Remove all non-digits
		const digits = text.replace(/\D/g, "");

		// Format as (XXX) XXX-XXXX
		if (digits.length <= 3) {
			return digits;
		} else if (digits.length <= 6) {
			return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
		} else {
			return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(
				6,
				10
			)}`;
		}
	};

	const validateForm = () => {
		if (!username.trim()) {
			Alert.alert("Error", "Username is required");
			return false;
		}
		if (username.trim().length < 2) {
			Alert.alert("Error", "Username must be at least 2 characters");
			return false;
		}
		if (!password.trim()) {
			Alert.alert("Error", "Password is required");
			return false;
		}
		if (password.length < 6) {
			Alert.alert("Error", "Password must be at least 6 characters");
			return false;
		}

		// Additional validation for signup
		if (!isLogin) {
			if (!phoneNumber.replace(/\D/g, "")) {
				Alert.alert("Error", "Phone number is required for account creation");
				return false;
			}
			const digits = phoneNumber.replace(/\D/g, "");
			if (digits.length !== 10) {
				Alert.alert("Error", "Please enter a valid 10-digit phone number");
				return false;
			}
			if (password !== confirmPassword) {
				Alert.alert("Error", "Passwords do not match");
				return false;
			}
		}
		return true;
	};

	const handleLogin = async () => {
		if (!username.trim() || !password.trim()) {
			Alert.alert("Error", "Please enter both username and password");
			return;
		}

		// Additional client-side validation
		if (username.trim().length < 2) {
			Alert.alert("Error", "Username must be at least 2 characters");
			return;
		}

		if (password.length < 6) {
			Alert.alert("Error", "Password must be at least 6 characters");
			return;
		}

		setLocalLoading(true);
		try {
			const result = await login(username.trim(), password);
			if (!result.success) {
				// Increment failed attempts and clear password for security
				const newFailedAttempts = failedAttempts + 1;
				setFailedAttempts(newFailedAttempts);
				setPassword(""); // Clear password field for security

				// Show different messages based on failed attempts
				let alertTitle = "Login Failed";
				let alertMessage =
					result.error ||
					"Please check your username and password and try again.";

				if (newFailedAttempts >= 3) {
					alertTitle = "Multiple Failed Attempts";
					alertMessage = `${
						result.error || "Incorrect credentials."
					}\n\nFor security, please double-check your username and password.`;
				}

				// Show specific error message from the authentication context
				Alert.alert(alertTitle, alertMessage, [
					{ text: "OK" },
					{
						text: "Need Account?",
						onPress: () => {
							setIsLogin(false);
							setPassword("");
							setConfirmPassword("");
							setFailedAttempts(0); // Reset failed attempts when switching to signup
						},
					},
				]);
			} else {
				// Reset failed attempts on successful login
				setFailedAttempts(0);
			}
		} catch (error) {
			setPassword(""); // Clear password field on error
			Alert.alert(
				"Connection Error",
				"Unable to connect to the server. Please check your internet connection and try again."
			);
		} finally {
			setLocalLoading(false);
		}
	};

	const handleSignup = async () => {
		if (!validateForm()) return;

		setLocalLoading(true);
		try {
			const digits = phoneNumber.replace(/\D/g, "");
			const formattedPhone = `+1${digits}`;

			console.log("Starting signup process for:", username.trim());

			const result = await sendVerificationCode(
				username.trim(),
				formattedPhone,
				password,
				recaptchaVerifier.current
			);

			if (result.success) {
				console.log("SMS sent, navigating to verification screen");
				// Navigate to verification screen with the verification ID and user data
				navigation.navigate("PhoneVerification", {
					verificationId: result.verificationId,
					phoneNumber: formattedPhone,
					username: username.trim(),
					password: password,
				});
			} else {
				Alert.alert(
					"Error",
					result.error || "Failed to send verification code"
				);
			}
		} catch (error) {
			Alert.alert("Error", "Network error. Please check your connection.");
		} finally {
			setLocalLoading(false);
		}
	};

	const handleSubmit = () => {
		if (isLogin) {
			handleLogin();
		} else {
			handleSignup();
		}
	};

	const isLoading = loading || localLoading;

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : "height"}
		>
			{/* reCAPTCHA Verifier - Only needed for signup */}
			{!isLogin && (
				<FirebaseRecaptchaVerifierModal
					ref={recaptchaVerifier}
					firebaseConfig={firebaseApp.options}
					attemptInvisibleVerification={true}
					title="Verify you're human"
					cancelLabel="Cancel"
				/>
			)}

			<ScrollView contentContainerStyle={styles.content}>
				<Text style={styles.title}>Zeitgeist</Text>
				<Text style={styles.subtitle}>
					{isLogin ? "Welcome back" : "Join the conversation"}
				</Text>

				<Text style={styles.label}>Username</Text>
				<TextInput
					style={styles.input}
					placeholder="Enter your username"
					value={username}
					onChangeText={setUsername}
					autoCapitalize="none"
					autoCorrect={false}
					editable={!isLoading}
					maxLength={30}
				/>

				{!isLogin && (
					<>
						<Text style={styles.label}>Phone Number</Text>
						<TextInput
							style={styles.input}
							placeholder="(555) 123-4567"
							value={phoneNumber}
							onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
							keyboardType="phone-pad"
							editable={!isLoading}
							maxLength={14}
						/>
					</>
				)}

				<Text style={styles.label}>Password</Text>
				<TextInput
					style={[
						styles.input,
						failedAttempts > 0 && isLogin && styles.inputError,
					]}
					placeholder="Enter your password"
					value={password}
					onChangeText={setPassword}
					secureTextEntry
					editable={!isLoading}
				/>

				{failedAttempts > 0 && isLogin && (
					<Text style={styles.errorText}>
						{failedAttempts === 1
							? "Incorrect credentials. Please try again."
							: `${failedAttempts} failed attempts. Please check your username and password.`}
					</Text>
				)}

				{!isLogin && (
					<>
						<Text style={styles.label}>Confirm Password</Text>
						<TextInput
							style={styles.input}
							placeholder="Confirm your password"
							value={confirmPassword}
							onChangeText={setConfirmPassword}
							secureTextEntry
							editable={!isLoading}
						/>
					</>
				)}

				<TouchableOpacity
					style={[styles.button, isLoading && styles.buttonDisabled]}
					onPress={handleSubmit}
					disabled={isLoading}
				>
					{isLoading ? (
						<ActivityIndicator color="white" />
					) : (
						<Text style={styles.buttonText}>
							{isLogin ? "Login" : "Create Account"}
						</Text>
					)}
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.switchButton}
					onPress={() => {
						setIsLogin(!isLogin);
						setPassword("");
						setConfirmPassword("");
						setUsername("");
						setPhoneNumber("");
						setFailedAttempts(0); // Reset failed attempts when switching modes
					}}
					disabled={isLoading}
				>
					<Text style={styles.switchText}>
						{isLogin
							? "Don't have an account? Sign up"
							: "Already have an account? Login"}
					</Text>
				</TouchableOpacity>

				<View style={styles.infoContainer}>
					<Text style={styles.infoText}>
						{isLogin ? (
							<>
								🔒 <Text style={styles.boldText}>Secure Login:</Text> Enter your
								username and password to access your account.
							</>
						) : (
							<>
								📱 <Text style={styles.boldText}>Phone Verification:</Text>{" "}
								We'll send you a verification code to confirm your phone number
								during signup.
								{"\n"}This is a one-time process for account security.
							</>
						)}
					</Text>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f5",
	},
	content: {
		flexGrow: 1,
		justifyContent: "center",
		paddingHorizontal: 30,
		paddingVertical: 20,
	},
	title: {
		fontSize: 32,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: 10,
		color: "#333",
	},
	subtitle: {
		fontSize: 16,
		textAlign: "center",
		marginBottom: 40,
		color: "#666",
	},
	label: {
		fontSize: 14,
		fontWeight: "500",
		color: "#333",
		marginBottom: 8,
		marginLeft: 4,
	},
	input: {
		backgroundColor: "white",
		paddingHorizontal: 15,
		paddingVertical: 12,
		marginBottom: 20,
		borderRadius: 8,
		fontSize: 16,
		borderWidth: 1,
		borderColor: "#ddd",
	},
	inputError: {
		borderColor: "#FF6B6B",
		borderWidth: 2,
	},
	errorText: {
		color: "#FF6B6B",
		fontSize: 12,
		marginTop: -10,
		marginBottom: 10,
		textAlign: "center",
	},
	button: {
		backgroundColor: "#007AFF",
		paddingVertical: 15,
		borderRadius: 8,
		marginTop: 10,
		minHeight: 50,
		justifyContent: "center",
	},
	buttonDisabled: {
		backgroundColor: "#ccc",
	},
	buttonText: {
		color: "white",
		textAlign: "center",
		fontSize: 16,
		fontWeight: "600",
	},
	switchButton: {
		marginTop: 20,
	},
	switchText: {
		textAlign: "center",
		color: "#007AFF",
		fontSize: 14,
	},
	infoContainer: {
		marginTop: 30,
		padding: 15,
		backgroundColor: "#e8f5e8",
		borderRadius: 8,
		borderLeftWidth: 4,
		borderLeftColor: "#4CAF50",
	},
	infoText: {
		fontSize: 13,
		color: "#2E7D32",
		textAlign: "center",
		lineHeight: 18,
	},
	boldText: {
		fontWeight: "600",
	},
});
