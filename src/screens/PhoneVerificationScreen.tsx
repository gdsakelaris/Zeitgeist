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

interface RouteParams {
	verificationId: string;
	phoneNumber: string;
	username: string;
}

interface PhoneVerificationScreenProps {
	route: {
		params: RouteParams;
	};
	navigation: {
		goBack: () => void;
		navigate: (screen: string, params?: any) => void;
	};
}

export default function PhoneVerificationScreen({
	route,
	navigation,
}: PhoneVerificationScreenProps) {
	const { verificationId, phoneNumber, username } = route.params;
	const { verifyCode, sendVerificationCode } = useAuth();

	const [code, setCode] = useState("");
	const [verifying, setVerifying] = useState(false);
	const [resending, setResending] = useState(false);
	const [timer, setTimer] = useState(60);
	const [canResend, setCanResend] = useState(false);

	const codeInputRef = useRef<TextInput>(null);

	useEffect(() => {
		// Auto-focus the input
		setTimeout(() => {
			codeInputRef.current?.focus();
		}, 500);

		// Start countdown timer
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
		// Only allow digits and limit to 6 characters
		const digits = text.replace(/\D/g, "").slice(0, 6);

		// Add spaces for better readability
		return digits.replace(/(\d{3})(\d{1,3})/, "$1 $2");
	};

	const handleCodeChange = (text: string) => {
		const formatted = formatCode(text);
		setCode(formatted);

		// Auto-verify when 6 digits are entered
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
			const result = await verifyCode(
				verificationId,
				verificationCode,
				username
			);

			if (!result.success) {
				Alert.alert("Error", result.error || "Invalid verification code");
				setCode(""); // Clear the code on error
			}
			// If successful, the auth state will update and navigate automatically
		} catch (error) {
			Alert.alert("Error", "Verification failed. Please try again.");
			setCode("");
		} finally {
			setVerifying(false);
		}
	};

	const handleResendCode = async () => {
		setResending(true);
		try {
			const result = await sendVerificationCode(phoneNumber);

			if (result.success) {
				Alert.alert(
					"Code Sent",
					"A new verification code has been sent to your phone."
				);
				setTimer(60);
				setCanResend(false);
				setCode("");

				// Restart timer
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
			} else {
				Alert.alert("Error", result.error || "Failed to resend code");
			}
		} catch (error) {
			Alert.alert("Error", "Failed to resend verification code");
		} finally {
			setResending(false);
		}
	};

	const maskPhoneNumber = (phone: string) => {
		// Show only last 4 digits: +1 (***) ***-1234
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

				<Text style={styles.title}>Enter Verification Code</Text>
				<Text style={styles.subtitle}>We sent a 6-digit code to</Text>
				<Text style={styles.phoneNumber}>{maskPhoneNumber(phoneNumber)}</Text>

				<View style={styles.codeContainer}>
					<TextInput
						ref={codeInputRef}
						style={styles.codeInput}
						value={code}
						onChangeText={handleCodeChange}
						placeholder="000 000"
						placeholderTextColor="#ccc"
						keyboardType="number-pad"
						maxLength={7} // 6 digits + 1 space
						editable={!verifying}
						textAlign="center"
						fontSize={24}
						letterSpacing={2}
					/>
				</View>

				{verifying && (
					<View style={styles.verifyingContainer}>
						<ActivityIndicator
							size="small"
							color="#007AFF"
						/>
						<Text style={styles.verifyingText}>Verifying...</Text>
					</View>
				)}

				<View style={styles.resendContainer}>
					{canResend ? (
						<TouchableOpacity
							style={styles.resendButton}
							onPress={handleResendCode}
							disabled={resending}
						>
							{resending ? (
								<ActivityIndicator
									size="small"
									color="#007AFF"
								/>
							) : (
								<>
									<Ionicons
										name="refresh"
										size={16}
										color="#007AFF"
									/>
									<Text style={styles.resendText}>Resend Code</Text>
								</>
							)}
						</TouchableOpacity>
					) : (
						<Text style={styles.timerText}>Resend code in {timer}s</Text>
					)}
				</View>

				<View style={styles.helpContainer}>
					<Text style={styles.helpText}>
						Didn't receive the code? Check that your phone has signal and try
						resending.
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
		marginBottom: 40,
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
		marginBottom: 30,
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
		borderTopWidth: 1,
		borderTopColor: "#e0e0e0",
	},
	helpText: {
		fontSize: 12,
		textAlign: "center",
		color: "#999",
		lineHeight: 16,
	},
});
