import React, { useState } from "react";
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
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

interface AuthScreenProps {
	navigation: {
		navigate: (screen: string, params?: any) => void;
	};
}

export default function AuthScreen({ navigation }: AuthScreenProps) {
	const [phoneNumber, setPhoneNumber] = useState("");
	const [username, setUsername] = useState("");
	const [localLoading, setLocalLoading] = useState(false);
	const { sendVerificationCode, loading } = useAuth();

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
		if (!phoneNumber.replace(/\D/g, "")) {
			Alert.alert("Error", "Phone number is required");
			return false;
		}
		const digits = phoneNumber.replace(/\D/g, "");
		if (digits.length !== 10) {
			Alert.alert("Error", "Please enter a valid 10-digit phone number");
			return false;
		}
		return true;
	};

	const handleSendCode = async () => {
		if (!validateForm()) return;

		setLocalLoading(true);
		try {
			const digits = phoneNumber.replace(/\D/g, "");
			const formattedPhone = `+1${digits}`;

			const result = await sendVerificationCode(formattedPhone);

			if (result.success) {
				// Navigate to verification screen with the verification ID and user data
				navigation.navigate("PhoneVerification", {
					verificationId: result.verificationId,
					phoneNumber: formattedPhone,
					username: username.trim(),
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

	const isLoading = loading || localLoading;

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : "height"}
		>
			<View style={styles.content}>
				<Text style={styles.title}>Zeitgeist</Text>
				<Text style={styles.subtitle}>Join the conversation</Text>

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

				<TouchableOpacity
					style={[styles.button, isLoading && styles.buttonDisabled]}
					onPress={handleSendCode}
					disabled={isLoading}
				>
					{isLoading ? (
						<ActivityIndicator color="white" />
					) : (
						<Text style={styles.buttonText}>Send Verification Code</Text>
					)}
				</TouchableOpacity>

				<View style={styles.noteContainer}>
					<Text style={styles.noteText}>
						📱 We'll send you a 6-digit verification code via SMS
					</Text>
				</View>

				<View style={styles.termsContainer}>
					<Text style={styles.termsText}>
						By continuing, you agree to our Terms of Service and Privacy Policy.
						Message and data rates may apply.
					</Text>
				</View>
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f5",
	},
	content: {
		flex: 1,
		justifyContent: "center",
		paddingHorizontal: 30,
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
	noteContainer: {
		marginTop: 20,
		padding: 15,
		backgroundColor: "#f0f8ff",
		borderRadius: 8,
		borderLeftWidth: 4,
		borderLeftColor: "#007AFF",
	},
	noteText: {
		fontSize: 14,
		color: "#666",
		textAlign: "center",
	},
	termsContainer: {
		marginTop: 20,
		paddingHorizontal: 10,
	},
	termsText: {
		fontSize: 12,
		color: "#999",
		textAlign: "center",
		lineHeight: 16,
	},
});
