import React, { useState } from "react";
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
import { updateProfile, updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../config/firebase";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen({ navigation }: { navigation: any }) {
	const { user, firebaseUser, logout } = useAuth();
	const [username, setUsername] = useState(user?.username || "");
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);

	const updateUsername = async () => {
		if (!username.trim() || username === user?.username) {
			Alert.alert("Error", "Please enter a new username");
			return;
		}

		if (username.trim().length < 2) {
			Alert.alert("Error", "Username must be at least 2 characters");
			return;
		}

		setLoading(true);
		try {
			// Update Firebase Auth display name
			if (firebaseUser) {
				await updateProfile(firebaseUser, { displayName: username });
			}

			// Update Firestore user document
			if (user) {
				await updateDoc(doc(db, "users", user.id), {
					username: username.trim(),
				});
			}

			Alert.alert("Success", "Username updated successfully");
		} catch (error) {
			console.error("Error updating username:", error);
			Alert.alert("Error", "Failed to update username");
		} finally {
			setLoading(false);
		}
	};

	const updateUserPassword = async () => {
		if (!newPassword || newPassword.length < 6) {
			Alert.alert("Error", "New password must be at least 6 characters");
			return;
		}
		if (newPassword !== confirmPassword) {
			Alert.alert("Error", "Passwords do not match");
			return;
		}

		setLoading(true);
		try {
			if (firebaseUser) {
				await updatePassword(firebaseUser, newPassword);
				Alert.alert("Success", "Password updated successfully");
				setCurrentPassword("");
				setNewPassword("");
				setConfirmPassword("");
			}
		} catch (error: any) {
			console.error("Error updating password:", error);
			if (error.code === "auth/requires-recent-login") {
				Alert.alert(
					"Authentication Required",
					"Please log out and log back in before changing your password"
				);
			} else {
				Alert.alert("Error", "Failed to update password");
			}
		} finally {
			setLoading(false);
		}
	};

	const handleLogout = () => {
		Alert.alert("Logout", "Are you sure you want to logout?", [
			{ text: "Cancel", style: "cancel" },
			{ text: "Logout", style: "destructive", onPress: logout },
		]);
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
				<Text style={styles.headerTitle}>Profile Settings</Text>
				<View style={{ width: 24 }} />
			</View>

			<View style={styles.content}>
				<View style={styles.avatarSection}>
					<View style={styles.largeAvatar}>
						<Text style={styles.largeAvatarText}>
							{user?.username?.charAt(0).toUpperCase()}
						</Text>
					</View>
					<Text style={styles.currentUsername}>{user?.username}</Text>
					<Text style={styles.phoneNumber}>
						{maskPhoneNumber(user?.phoneNumber || "")}
					</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Account Information</Text>

					<Text style={styles.label}>Phone Number</Text>
					<Text style={styles.phoneText}>
						{maskPhoneNumber(user?.phoneNumber || "")}
					</Text>
					<Text style={styles.phoneNote}>
						Phone number cannot be changed after registration
					</Text>

					<Text style={styles.label}>Username</Text>
					<TextInput
						style={styles.input}
						value={username}
						onChangeText={setUsername}
						placeholder="Enter username"
						autoCapitalize="none"
						editable={!loading}
						maxLength={30}
					/>
					<TouchableOpacity
						style={[
							styles.button,
							styles.primaryButton,
							(loading || username === user?.username) && styles.buttonDisabled,
						]}
						onPress={updateUsername}
						disabled={loading || username === user?.username}
					>
						{loading ? (
							<ActivityIndicator color="white" />
						) : (
							<Text style={styles.buttonText}>Update Username</Text>
						)}
					</TouchableOpacity>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Change Password</Text>

					<Text style={styles.label}>New Password</Text>
					<TextInput
						style={styles.input}
						value={newPassword}
						onChangeText={setNewPassword}
						placeholder="Enter new password"
						secureTextEntry
						editable={!loading}
					/>

					<Text style={styles.label}>Confirm New Password</Text>
					<TextInput
						style={styles.input}
						value={confirmPassword}
						onChangeText={setConfirmPassword}
						placeholder="Confirm new password"
						secureTextEntry
						editable={!loading}
					/>

					<TouchableOpacity
						style={[
							styles.button,
							styles.primaryButton,
							(loading || !newPassword || newPassword !== confirmPassword) &&
								styles.buttonDisabled,
						]}
						onPress={updateUserPassword}
						disabled={
							loading || !newPassword || newPassword !== confirmPassword
						}
					>
						{loading ? (
							<ActivityIndicator color="white" />
						) : (
							<Text style={styles.buttonText}>Update Password</Text>
						)}
					</TouchableOpacity>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Account Actions</Text>
					<TouchableOpacity
						style={[styles.button, styles.dangerButton]}
						onPress={handleLogout}
					>
						<Ionicons
							name="log-out-outline"
							size={20}
							color="#FF3B30"
							style={styles.buttonIcon}
						/>
						<Text style={[styles.buttonText, styles.dangerButtonText]}>
							Logout
						</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.footer}>
					<Text style={styles.versionText}>Zeitgeist v1.0.0</Text>
					<Text style={styles.copyrightText}>
						© 2024 Zeitgeist. All rights reserved.
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
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingVertical: 15,
		backgroundColor: "white",
		borderBottomWidth: 1,
		borderBottomColor: "#e0e0e0",
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#333",
	},
	content: {
		flex: 1,
		padding: 20,
	},
	avatarSection: {
		alignItems: "center",
		backgroundColor: "white",
		borderRadius: 12,
		padding: 30,
		marginBottom: 20,
	},
	largeAvatar: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: "#007AFF",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 15,
	},
	largeAvatarText: {
		color: "white",
		fontSize: 32,
		fontWeight: "600",
	},
	currentUsername: {
		fontSize: 20,
		fontWeight: "600",
		color: "#333",
		marginBottom: 5,
	},
	phoneNumber: {
		fontSize: 14,
		color: "#666",
	},
	section: {
		backgroundColor: "white",
		borderRadius: 12,
		padding: 20,
		marginBottom: 20,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: "600",
		marginBottom: 15,
		color: "#333",
	},
	label: {
		fontSize: 14,
		fontWeight: "500",
		color: "#666",
		marginBottom: 5,
	},
	phoneText: {
		fontSize: 16,
		color: "#333",
		paddingVertical: 12,
		paddingHorizontal: 15,
		backgroundColor: "#f9f9f9",
		borderRadius: 8,
		marginBottom: 5,
	},
	phoneNote: {
		fontSize: 12,
		color: "#999",
		marginBottom: 15,
		fontStyle: "italic",
	},
	input: {
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 8,
		paddingVertical: 12,
		paddingHorizontal: 15,
		fontSize: 16,
		marginBottom: 15,
		backgroundColor: "white",
	},
	button: {
		flexDirection: "row",
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		minHeight: 44,
	},
	primaryButton: {
		backgroundColor: "#007AFF",
	},
	buttonDisabled: {
		backgroundColor: "#ccc",
	},
	dangerButton: {
		backgroundColor: "transparent",
		borderWidth: 1,
		borderColor: "#FF3B30",
	},
	buttonIcon: {
		marginRight: 8,
	},
	buttonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
	dangerButtonText: {
		color: "#FF3B30",
	},
	footer: {
		alignItems: "center",
		paddingTop: 20,
	},
	versionText: {
		fontSize: 12,
		color: "#999",
		marginBottom: 5,
	},
	copyrightText: {
		fontSize: 10,
		color: "#ccc",
	},
});
