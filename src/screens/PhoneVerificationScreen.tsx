import React, { useState, useEffect, useRef } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	SafeAreaView,
	Alert,
	ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";

export default function PhoneVerificationScreen({ route, navigation }: any) {
	const { verificationId, phoneNumber, username, password } = route.params;
	const { verifyCode } = useAuth();

	const [code, setCode] = useState("");
	const [verifying, setVerifying] = useState(false);
	const [timer, setTimer] = useState(60);
	const [canResend, setCanResend] = useState(false);

	const codeInputRef = useRef<TextInput>(null);

	useEffect(() => {
		setTimeout(() => {
			codeInputRef.current?.focus();
		}, 500);

		const interval = setInterval(() => {
			setTimer((prev) => {
				if (prev <= 1) {
					setCanResend(true);
					clearInterval(interval);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	const formatCode = (text: string) => {
		const digits = text.replace(/\D/g, "").slice(0, 6);
		return digits.replace(/(\d{3})(\d{1,3})/, "$1 $2");
	};

	const handleCodeChange = (text: string) => {
		const formatted = formatCode(text);
		setCode(formatted);
		const digits = text.replace(/\D/g, "");
		if (digits.length === 6) {
			handleVerifyCode(digits);
		}
	};

	const handleVerifyCode = async (codeToVerify?: string) => {
		const verificationCode = codeToVerify || code.replace(/\D/g, "");

		if (verificationCode.length !== 6) {
			Alert.alert("Error", "Please enter a 6-digit verification code");
			return;
		}

		setVerifying(true);
		try {
			console.log("Verifying code:", verificationCode);
			console.log("Creating account for:", username);

			const result = await verifyCode(
				verificationId,
				verificationCode,
				username,
				phoneNumber,
				password
			);

			if (!result.success) {
				Alert.alert("Error", result.error || "Invalid verification code");
				setCode("");
			}
			// If successful, the AuthContext will automatically navigate to the main app
		} catch (error) {
			Alert.alert("Error", "Verification failed. Please try again.");
			setCode("");
		} finally {
			setVerifying(false);
		}
	};

	const handleResendCode = () => {
		Alert.alert(
			"Resend Code",
			"To resend the verification code, please go back and try signing up again.",
			[
				{ text: "Cancel", style: "cancel" },
				{ text: "Go Back", onPress: () => navigation.goBack() },
			]
		);
	};

	const maskPhoneNumber = (phone: string) => {
		const cleaned = phone.replace(/\D/g, "");
		if (cleaned.length >= 10) {
			const lastFour = cleaned.slice(-4);
			return `+1 (***) ***-${lastFour}`;
		}
		return phone;
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Ionicons
						name="arrow-back"
						size={24}
						color="#007AFF"
					/>
				</TouchableOpacity>
			</View>

			<View style={styles.content}>
				<View style={styles.iconContainer}>
					<Ionicons
						name="phone-portrait-outline"
						size={80}
						color="#007AFF"
					/>
				</View>

				<Text style={styles.title}>Verify Your Phone</Text>
				<Text style={styles.subtitle}>We sent a 6-digit code to</Text>
				<Text style={styles.phoneNumber}>{maskPhoneNumber(phoneNumber)}</Text>

				<View style={styles.accountInfo}>
					<Text style={styles.accountText}>
						Creating account for:{" "}
						<Text style={styles.username}>{username}</Text>
					</Text>
				</View>

				<View style={styles.codeContainer}>
					<TextInput
						ref={codeInputRef}
						style={[styles.codeInput, { fontSize: 24, letterSpacing: 2 }]}
						value={code}
						onChangeText={handleCodeChange}
						placeholder="000 000"
						placeholderTextColor="#ccc"
						keyboardType="number-pad"
						maxLength={7}
						editable={!verifying}
						textAlign="center"
					/>
				</View>

				{verifying && (
					<View style={styles.verifyingContainer}>
						<ActivityIndicator
							size="small"
							color="#007AFF"
						/>
						<Text style={styles.verifyingText}>Creating your account...</Text>
					</View>
				)}

				<View style={styles.resendContainer}>
					{canResend ? (
						<TouchableOpacity
							style={styles.resendButton}
							onPress={handleResendCode}
						>
							<Ionicons
								name="refresh"
								size={16}
								color="#007AFF"
							/>
							<Text style={styles.resendText}>Didn't get the code?</Text>
						</TouchableOpacity>
					) : (
						<Text style={styles.timerText}>Resend available in {timer}s</Text>
					)}
				</View>

				<View style={styles.helpContainer}>
					<Text style={styles.helpText}>
						📱 Check your messages for the verification code.
						{"\n"}It may take a few moments to arrive.
					</Text>
				</View>

				<View style={styles.infoContainer}>
					<Text style={styles.infoText}>
						🛡️ <Text style={styles.boldText}>Security:</Text> This one-time
						verification confirms your phone number ownership.
						{"\n"}After this, you'll only need your username and password to
						login.
					</Text>
				</View>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f5",
	},
	header: {
		paddingHorizontal: 20,
		paddingVertical: 15,
	},
	content: {
		flex: 1,
		paddingHorizontal: 30,
		justifyContent: "center",
	},
	iconContainer: {
		alignItems: "center",
		marginBottom: 30,
	},
	title: {
		fontSize: 28,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: 10,
		color: "#333",
	},
	subtitle: {
		fontSize: 16,
		textAlign: "center",
		color: "#666",
		marginBottom: 5,
	},
	phoneNumber: {
		fontSize: 16,
		fontWeight: "600",
		textAlign: "center",
		color: "#007AFF",
		marginBottom: 20,
	},
	accountInfo: {
		backgroundColor: "#e3f2fd",
		padding: 15,
		borderRadius: 8,
		marginBottom: 30,
		borderLeftWidth: 4,
		borderLeftColor: "#2196f3",
	},
	accountText: {
		fontSize: 14,
		color: "#1565c0",
		textAlign: "center",
	},
	username: {
		fontWeight: "600",
		color: "#0d47a1",
	},
	codeContainer: {
		marginBottom: 30,
	},
	codeInput: {
		backgroundColor: "white",
		borderWidth: 2,
		borderColor: "#007AFF",
		borderRadius: 12,
		paddingVertical: 15,
		paddingHorizontal: 20,
		fontWeight: "600",
		color: "#333",
	},
	verifyingContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 20,
	},
	verifyingText: {
		marginLeft: 8,
		fontSize: 14,
		color: "#666",
	},
	resendContainer: {
		alignItems: "center",
		marginBottom: 20,
	},
	resendButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 10,
		paddingHorizontal: 20,
	},
	resendText: {
		marginLeft: 6,
		fontSize: 16,
		color: "#007AFF",
		fontWeight: "500",
	},
	timerText: {
		fontSize: 14,
		color: "#999",
	},
	helpContainer: {
		paddingTop: 20,
		paddingBottom: 15,
		borderTopWidth: 1,
		borderTopColor: "#e0e0e0",
	},
	helpText: {
		fontSize: 12,
		textAlign: "center",
		color: "#666",
		lineHeight: 16,
	},
	infoContainer: {
		padding: 15,
		backgroundColor: "#e8f5e8",
		borderRadius: 8,
		borderLeftWidth: 4,
		borderLeftColor: "#4CAF50",
	},
	infoText: {
		fontSize: 12,
		color: "#2E7D32",
		textAlign: "center",
		lineHeight: 16,
	},
	boldText: {
		fontWeight: "600",
	},
});
