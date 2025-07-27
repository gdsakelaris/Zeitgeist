import React, { useState, useRef, useCallback, useMemo } from "react";
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
import { getApps } from "firebase/app";
import { useAuth } from "../contexts/AuthContext";
import { useNetwork } from "../components/NetworkProvider";
import { useAnalytics, Analytics } from "../utils/analytics";
import { InputSanitizer, RateLimit } from "../utils/inputSanitizer";
import { ErrorHandler } from "../utils/errorHandler";
import { VALIDATION } from "../utils/constants";
import { Ionicons } from "@expo/vector-icons";

// Conditional haptics import
let Haptics: any = null;
try {
	Haptics = require("expo-haptics");
} catch (error) {
	Haptics = {
		impactAsync: () => Promise.resolve(),
		ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
	};
}

// Get Firebase app instance (already initialized in firebase.ts)
const firebaseApp = getApps()[0];

interface AuthScreenProps {
	navigation: {
		navigate: (screen: string, params?: any) => void;
	};
}

interface ValidationError {
	field: string;
	message: string;
}

export default function AuthScreen({ navigation }: AuthScreenProps) {
	// Analytics tracking
	useAnalytics("AuthScreen");

	// State management
	const [isLogin, setIsLogin] = useState(true);
	const [username, setUsername] = useState("");
	const [phoneNumber, setPhoneNumber] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [localLoading, setLocalLoading] = useState(false);
	const [failedAttempts, setFailedAttempts] = useState(0);
	const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	// Hooks
	const { login, sendVerificationCode, loading } = useAuth();
	const { isConnected } = useNetwork();
	const recaptchaVerifier = useRef(null);

	// Real-time validation
	const usernameValidation = useMemo(() => {
		if (!username) return { isValid: true, error: "" };
		return InputSanitizer.validateUsername(username);
	}, [username]);

	const phoneValidation = useMemo(() => {
		if (!phoneNumber || isLogin) return { isValid: true, error: "" };
		const sanitized = InputSanitizer.sanitizePhoneNumber(phoneNumber);
		return InputSanitizer.validatePhoneNumber(sanitized);
	}, [phoneNumber, isLogin]);

	const passwordValidation = useMemo(() => {
		if (!password) return { isValid: true, error: "" };
		if (password.length < 6) {
			return { isValid: false, error: "Password must be at least 6 characters" };
		}
		if (password.length > 128) {
			return { isValid: false, error: "Password must be less than 128 characters" };
		}
		return { isValid: true, error: "" };
	}, [password]);

	const confirmPasswordValidation = useMemo(() => {
		if (isLogin || !confirmPassword) return { isValid: true, error: "" };
		if (password !== confirmPassword) {
			return { isValid: false, error: "Passwords do not match" };
		}
		return { isValid: true, error: "" };
	}, [password, confirmPassword, isLogin]);

	// Format phone number with input sanitization
	const formatPhoneNumber = useCallback((text: string) => {
		const sanitized = InputSanitizer.sanitizePhoneNumber(text);
		const digits = sanitized.replace(/[^\d]/g, "");

		// Format as (XXX) XXX-XXXX for display
		if (digits.length <= 3) {
			return digits;
		} else if (digits.length <= 6) {
			return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
		} else {
			return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
		}
	}, []);

	// Comprehensive form validation
	const validateForm = useCallback((): boolean => {
		const errors: ValidationError[] = [];

		// Username validation
		if (!usernameValidation.isValid) {
			errors.push({ field: "username", message: usernameValidation.error || "Invalid username" });
		}

		// Phone validation for signup
		if (!isLogin && !phoneValidation.isValid) {
			errors.push({ field: "phone", message: phoneValidation.error || "Invalid phone number" });
		}

		// Password validation
		if (!passwordValidation.isValid) {
			errors.push({ field: "password", message: passwordValidation.error || "Invalid password" });
		}

		// Confirm password validation for signup
		if (!isLogin && !confirmPasswordValidation.isValid) {
			errors.push({ field: "confirmPassword", message: confirmPasswordValidation.error || "Passwords do not match" });
		}

		// Check for empty required fields
		if (!username.trim()) {
			errors.push({ field: "username", message: "Username is required" });
		}
		if (!password.trim()) {
			errors.push({ field: "password", message: "Password is required" });
		}
		if (!isLogin && !phoneNumber.trim()) {
			errors.push({ field: "phone", message: "Phone number is required" });
		}
		if (!isLogin && !confirmPassword.trim()) {
			errors.push({ field: "confirmPassword", message: "Please confirm your password" });
		}

		setValidationErrors(errors);

		if (errors.length > 0) {
			const firstError = errors[0];
			Alert.alert("Validation Error", firstError.message);
			return false;
		}

		return true;
	}, [username, phoneNumber, password, confirmPassword, isLogin, usernameValidation, phoneValidation, passwordValidation, confirmPasswordValidation]);

	// Handle login with rate limiting and improved security
	const handleLogin = useCallback(async () => {
		if (!isConnected) {
			Alert.alert("No Connection", "Please check your internet connection and try again.");
			return;
		}

		// Rate limiting
		const rateLimitKey = `login_${username.trim()}`;
		if (RateLimit.checkLimit(rateLimitKey, 5, 300000)) { // 5 attempts per 5 minutes
			Alert.alert("Too Many Attempts", "Too many login attempts. Please wait 5 minutes before trying again.");
			return;
		}

		if (!validateForm()) return;

		await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setLocalLoading(true);

		try {
			const sanitizedUsername = InputSanitizer.sanitizeUsername(username);
			const result = await login(sanitizedUsername, password);
			
			if (!result.success) {
				const newFailedAttempts = failedAttempts + 1;
				setFailedAttempts(newFailedAttempts);
				setPassword(""); // Clear password for security

				Analytics.logEvent("login_failed", {
					error: result.error,
					attempts: newFailedAttempts,
				});

				let alertTitle = "Login Failed";
				let alertMessage = result.error || "Please check your username and password and try again.";

				if (newFailedAttempts >= 3) {
					alertTitle = "Multiple Failed Attempts";
					alertMessage = `${result.error || "Incorrect credentials."}\n\nFor security, please double-check your username and password.`;
				}

				Alert.alert(alertTitle, alertMessage, [
					{ text: "OK" },
					{
						text: "Create Account",
						onPress: () => {
							setIsLogin(false);
							setPassword("");
							setConfirmPassword("");
							setFailedAttempts(0);
						},
					},
				]);
			} else {
				setFailedAttempts(0);
				RateLimit.resetLimit(rateLimitKey);
				Analytics.logEvent("login_success");
			}
		} catch (error) {
			console.error("Login error:", error);
			setPassword("");
			const appError = ErrorHandler.handle(error, "login");
			ErrorHandler.showAlert(appError, "Login Error");
		} finally {
			setLocalLoading(false);
		}
	}, [isConnected, username, password, validateForm, failedAttempts, login]);

	// Handle signup with enhanced validation
	const handleSignup = useCallback(async () => {
		if (!isConnected) {
			Alert.alert("No Connection", "Please check your internet connection and try again.");
			return;
		}

		if (!validateForm()) return;

		await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setLocalLoading(true);

		try {
			const sanitizedUsername = InputSanitizer.sanitizeUsername(username);
			const sanitizedPhone = InputSanitizer.sanitizePhoneNumber(phoneNumber);
			
			Analytics.logEvent("signup_started", {
				usernameLength: sanitizedUsername.length,
			});

			const result = await sendVerificationCode(
				sanitizedUsername,
				sanitizedPhone,
				password,
				recaptchaVerifier.current
			);

			if (result.success) {
				Analytics.logEvent("sms_verification_sent");
				navigation.navigate("PhoneVerification", {
					verificationId: result.verificationId,
					phoneNumber: sanitizedPhone,
					username: sanitizedUsername,
					password: password,
				});
			} else {
				Analytics.logEvent("signup_failed", { error: result.error });
				const appError = ErrorHandler.handle(new Error(result.error), "signup");
				ErrorHandler.showAlert(appError, "Signup Error");
			}
		} catch (error) {
			console.error("Signup error:", error);
			const appError = ErrorHandler.handle(error, "signup");
			ErrorHandler.showAlert(appError, "Signup Error");
		} finally {
			setLocalLoading(false);
		}
	}, [isConnected, validateForm, username, phoneNumber, password, sendVerificationCode, navigation]);

	// Handle form submission
	const handleSubmit = useCallback(() => {
		if (isLogin) {
			handleLogin();
		} else {
			handleSignup();
		}
	}, [isLogin, handleLogin, handleSignup]);

	// Toggle auth mode with haptic feedback
	const toggleAuthMode = useCallback(async () => {
		await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setIsLogin(!isLogin);
		setPassword("");
		setConfirmPassword("");
		setUsername("");
		setPhoneNumber("");
		setFailedAttempts(0);
		setValidationErrors([]);
		
		Analytics.logEvent("auth_mode_switched", { to: isLogin ? "signup" : "login" });
	}, [isLogin]);

	// Handle input changes with sanitization
	const handleUsernameChange = useCallback((text: string) => {
		const sanitized = InputSanitizer.sanitizeUsername(text);
		setUsername(sanitized);
	}, []);

	const handlePhoneChange = useCallback((text: string) => {
		const formatted = formatPhoneNumber(text);
		setPhoneNumber(formatted);
	}, [formatPhoneNumber]);

	// Check if form is valid for submit button
	const isFormValid = useMemo(() => {
		return usernameValidation.isValid && 
			   passwordValidation.isValid && 
			   (isLogin || (phoneValidation.isValid && confirmPasswordValidation.isValid)) &&
			   username.trim() && 
			   password.trim() &&
			   (isLogin || (phoneNumber.trim() && confirmPassword.trim()));
	}, [usernameValidation, passwordValidation, phoneValidation, confirmPasswordValidation, username, password, phoneNumber, confirmPassword, isLogin]);

	const isLoading = loading || localLoading;
	const hasValidationError = (field: string) => validationErrors.some(error => error.field === field);

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

			<ScrollView 
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>Zeitgeist</Text>
					<Text style={styles.subtitle}>
						{isLogin ? "Welcome back" : "Join the conversation"}
					</Text>
					{!isConnected && (
						<View style={styles.offlineWarning}>
							<Ionicons name="cloud-offline-outline" size={16} color="#FF6B6B" />
							<Text style={styles.offlineText}>Offline - Connect to continue</Text>
						</View>
					)}
				</View>

				{/* Username Field */}
				<View style={styles.fieldContainer}>
					<Text style={styles.label}>Username</Text>
					<TextInput
						style={[
							styles.input,
							!usernameValidation.isValid && username && styles.inputError,
							hasValidationError("username") && styles.inputError,
						]}
						placeholder="Enter your username"
						value={username}
						onChangeText={handleUsernameChange}
						autoCapitalize="none"
						autoCorrect={false}
						editable={!isLoading}
						maxLength={VALIDATION.USERNAME.MAX_LENGTH}
						accessibilityLabel="Username"
						accessibilityHint="Enter your unique username"
					/>
					{!usernameValidation.isValid && username && (
						<Text style={styles.validationError}>{usernameValidation.error}</Text>
					)}
				</View>

				{/* Phone Number Field (Signup only) */}
				{!isLogin && (
					<View style={styles.fieldContainer}>
						<Text style={styles.label}>Phone Number</Text>
						<TextInput
							style={[
								styles.input,
								!phoneValidation.isValid && phoneNumber && styles.inputError,
								hasValidationError("phone") && styles.inputError,
							]}
							placeholder="(555) 123-4567"
							value={phoneNumber}
							onChangeText={handlePhoneChange}
							keyboardType="phone-pad"
							editable={!isLoading}
							maxLength={14}
							accessibilityLabel="Phone number"
							accessibilityHint="Enter your phone number for verification"
						/>
						{!phoneValidation.isValid && phoneNumber && (
							<Text style={styles.validationError}>{phoneValidation.error}</Text>
						)}
					</View>
				)}

				{/* Password Field */}
				<View style={styles.fieldContainer}>
					<Text style={styles.label}>Password</Text>
					<View style={styles.passwordContainer}>
						<TextInput
							style={[
								styles.passwordInput,
								!passwordValidation.isValid && password && styles.inputError,
								hasValidationError("password") && styles.inputError,
								failedAttempts > 0 && isLogin && styles.inputError,
							]}
							placeholder="Enter your password"
							value={password}
							onChangeText={setPassword}
							secureTextEntry={!showPassword}
							editable={!isLoading}
							maxLength={128}
							accessibilityLabel="Password"
							accessibilityHint="Enter your secure password"
						/>
						<TouchableOpacity
							style={styles.passwordToggle}
							onPress={() => setShowPassword(!showPassword)}
							accessibilityRole="button"
							accessibilityLabel={showPassword ? "Hide password" : "Show password"}
						>
							<Ionicons 
								name={showPassword ? "eye-off-outline" : "eye-outline"} 
								size={20} 
								color="#666" 
							/>
						</TouchableOpacity>
					</View>
					{!passwordValidation.isValid && password && (
						<Text style={styles.validationError}>{passwordValidation.error}</Text>
					)}
					{failedAttempts > 0 && isLogin && (
						<Text style={styles.errorText}>
							{failedAttempts === 1
								? "Incorrect credentials. Please try again."
								: `${failedAttempts} failed attempts. Please check your username and password.`}
						</Text>
					)}
				</View>

				{/* Confirm Password Field (Signup only) */}
				{!isLogin && (
					<View style={styles.fieldContainer}>
						<Text style={styles.label}>Confirm Password</Text>
						<View style={styles.passwordContainer}>
							<TextInput
								style={[
									styles.passwordInput,
									!confirmPasswordValidation.isValid && confirmPassword && styles.inputError,
									hasValidationError("confirmPassword") && styles.inputError,
								]}
								placeholder="Confirm your password"
								value={confirmPassword}
								onChangeText={setConfirmPassword}
								secureTextEntry={!showConfirmPassword}
								editable={!isLoading}
								maxLength={128}
								accessibilityLabel="Confirm password"
								accessibilityHint="Re-enter your password to confirm"
							/>
							<TouchableOpacity
								style={styles.passwordToggle}
								onPress={() => setShowConfirmPassword(!showConfirmPassword)}
								accessibilityRole="button"
								accessibilityLabel={showConfirmPassword ? "Hide password" : "Show password"}
							>
								<Ionicons 
									name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
									size={20} 
									color="#666" 
								/>
							</TouchableOpacity>
						</View>
						{!confirmPasswordValidation.isValid && confirmPassword && (
							<Text style={styles.validationError}>{confirmPasswordValidation.error}</Text>
						)}
					</View>
				)}

				{/* Submit Button */}
				<TouchableOpacity
					style={[
						styles.button, 
						(isLoading || !isConnected || !isFormValid) && styles.buttonDisabled
					]}
					onPress={handleSubmit}
					disabled={isLoading || !isConnected || !isFormValid}
					accessibilityRole="button"
					accessibilityLabel={isLogin ? "Login" : "Create account"}
					accessibilityState={{ disabled: isLoading || !isConnected || !isFormValid }}
				>
					{isLoading ? (
						<ActivityIndicator color="white" />
					) : (
						<Text style={styles.buttonText}>
							{isLogin ? "Login" : "Create Account"}
						</Text>
					)}
				</TouchableOpacity>

				{/* Switch Auth Mode */}
				<TouchableOpacity
					style={styles.switchButton}
					onPress={toggleAuthMode}
					disabled={isLoading}
					accessibilityRole="button"
					accessibilityLabel={isLogin ? "Switch to create account" : "Switch to login"}
				>
					<Text style={styles.switchText}>
						{isLogin
							? "Don't have an account? Sign up"
							: "Already have an account? Login"}
					</Text>
				</TouchableOpacity>

				{/* Info Container */}
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
								during signup.{"\n"}This is a one-time process for account security.
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
	header: {
		alignItems: "center",
		marginBottom: 40,
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
		color: "#666",
	},
	offlineWarning: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFF5F5",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 6,
		marginTop: 10,
		gap: 6,
	},
	offlineText: {
		fontSize: 14,
		color: "#FF6B6B",
		fontWeight: "500",
	},
	fieldContainer: {
		marginBottom: 20,
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
		borderRadius: 8,
		fontSize: 16,
		borderWidth: 1,
		borderColor: "#ddd",
	},
	passwordContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "white",
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#ddd",
	},
	passwordInput: {
		flex: 1,
		paddingHorizontal: 15,
		paddingVertical: 12,
		fontSize: 16,
	},
	passwordToggle: {
		paddingHorizontal: 15,
		paddingVertical: 12,
	},
	inputError: {
		borderColor: "#FF6B6B",
		borderWidth: 2,
	},
	validationError: {
		color: "#FF6B6B",
		fontSize: 12,
		marginTop: 4,
		marginLeft: 4,
	},
	errorText: {
		color: "#FF6B6B",
		fontSize: 12,
		marginTop: 4,
		textAlign: "center",
	},
	button: {
		backgroundColor: "#007AFF",
		paddingVertical: 15,
		borderRadius: 8,
		marginTop: 10,
		minHeight: 50,
		justifyContent: "center",
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 2,
	},
	buttonDisabled: {
		backgroundColor: "#ccc",
		elevation: 0,
		shadowOpacity: 0,
	},
	buttonText: {
		color: "white",
		textAlign: "center",
		fontSize: 16,
		fontWeight: "600",
	},
	switchButton: {
		marginTop: 20,
		paddingVertical: 10,
	},
	switchText: {
		textAlign: "center",
		color: "#007AFF",
		fontSize: 14,
		fontWeight: "500",
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
