import React from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	SafeAreaView,
	Alert,
	ScrollView,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen({ navigation }: { navigation: any }) {
	const { user, logout } = useAuth();

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
				<Text style={styles.headerTitle}>Profile</Text>
				<View style={{ width: 24 }} />
			</View>

			<ScrollView contentContainerStyle={styles.content}>
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

					<View style={styles.infoRow}>
						<Text style={styles.label}>Username</Text>
						<Text style={styles.value}>{user?.username}</Text>
					</View>

					<View style={styles.infoRow}>
						<Text style={styles.label}>Phone Number</Text>
						<Text style={styles.value}>
							{maskPhoneNumber(user?.phoneNumber || "")}
						</Text>
					</View>
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
			</ScrollView>
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
		flexGrow: 1,
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
	},
	infoRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 15,
		paddingVertical: 5,
	},
	value: {
		fontSize: 16,
		color: "#333",
		fontWeight: "500",
	},
	infoNote: {
		fontSize: 12,
		color: "#999",
		marginTop: 10,
		fontStyle: "italic",
		textAlign: "center",
		paddingHorizontal: 20,
	},
	button: {
		flexDirection: "row",
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		minHeight: 44,
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
