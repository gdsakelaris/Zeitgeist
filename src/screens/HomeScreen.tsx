import React from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { useAnalytics } from "../utils/analytics";

interface HomeScreenProps {
	navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
	// Analytics tracking
	useAnalytics("HomeScreen");

	// Hooks
	const { user } = useAuth();

	// Navigate to user's own page
	const goToMyPage = () => {
		if (user) {
			navigation.navigate("UserPage", {
				userId: user.id,
				username: user.username,
				isOwnPage: true,
			});
		}
	};

	// Navigate to user search
	const goToSearch = () => {
		navigation.navigate("UserSearch");
	};

	// Navigate to profile
	const goToProfile = () => {
		navigation.navigate("Profile");
	};

	return (
		<SafeAreaView style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.title}>Zeitgeist</Text>
				<Text style={styles.subtitle}>Personal Message Boards</Text>
			</View>

			{/* User Info */}
			<View style={styles.userSection}>
				<View style={styles.userAvatar}>
					<Text style={styles.userAvatarText}>
						{user?.username?.charAt(0).toUpperCase()}
					</Text>
				</View>
				<Text style={styles.welcomeText}>Welcome back, {user?.username}!</Text>
				<Text style={styles.descriptionText}>
					Share your thoughts on your personal page or discover what others are
					posting
				</Text>
			</View>

			{/* Main Actions */}
			<View style={styles.actionsContainer}>
				<TouchableOpacity
					style={[styles.actionButton, styles.primaryButton]}
					onPress={goToMyPage}
					accessibilityRole="button"
					accessibilityLabel="Go to my page"
				>
					<Ionicons
						name="person"
						size={24}
						color="white"
					/>
					<Text style={styles.primaryButtonText}>My Page</Text>
					<Text style={styles.buttonSubtext}>Post your thoughts</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.actionButton, styles.secondaryButton]}
					onPress={goToSearch}
					accessibilityRole="button"
					accessibilityLabel="Search users"
				>
					<Ionicons
						name="search"
						size={24}
						color="#007AFF"
					/>
					<Text style={styles.secondaryButtonText}>Discover Users</Text>
					<Text style={styles.buttonSubtext}>Find people to follow</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[styles.actionButton, styles.tertiaryButton]}
					onPress={goToProfile}
					accessibilityRole="button"
					accessibilityLabel="View profile"
				>
					<Ionicons
						name="settings"
						size={24}
						color="#666"
					/>
					<Text style={styles.tertiaryButtonText}>Settings</Text>
					<Text style={styles.buttonSubtext}>Manage your account</Text>
				</TouchableOpacity>
			</View>

			{/* Info Section */}
			<View style={styles.infoSection}>
				<Text style={styles.infoTitle}>How it works</Text>
				<View style={styles.infoItem}>
					<Ionicons
						name="checkmark-circle"
						size={16}
						color="#4CAF50"
					/>
					<Text style={styles.infoText}>
						Each user has their own message board
					</Text>
				</View>
				<View style={styles.infoItem}>
					<Ionicons
						name="checkmark-circle"
						size={16}
						color="#4CAF50"
					/>
					<Text style={styles.infoText}>Only you can post on your page</Text>
				</View>
				<View style={styles.infoItem}>
					<Ionicons
						name="checkmark-circle"
						size={16}
						color="#4CAF50"
					/>
					<Text style={styles.infoText}>
						Others can visit and read your posts
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
		alignItems: "center",
		paddingVertical: 30,
		paddingHorizontal: 20,
	},
	title: {
		fontSize: 32,
		fontWeight: "bold",
		color: "#333",
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: "#666",
		textAlign: "center",
	},
	userSection: {
		alignItems: "center",
		paddingHorizontal: 20,
		marginBottom: 40,
	},
	userAvatar: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: "#007AFF",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 15,
	},
	userAvatarText: {
		color: "white",
		fontSize: 28,
		fontWeight: "600",
	},
	welcomeText: {
		fontSize: 20,
		fontWeight: "600",
		color: "#333",
		marginBottom: 8,
	},
	descriptionText: {
		fontSize: 14,
		color: "#666",
		textAlign: "center",
		lineHeight: 20,
	},
	actionsContainer: {
		paddingHorizontal: 20,
		gap: 15,
	},
	actionButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 20,
		paddingHorizontal: 20,
		borderRadius: 16,
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
	},
	primaryButton: {
		backgroundColor: "#007AFF",
	},
	secondaryButton: {
		backgroundColor: "white",
		borderWidth: 2,
		borderColor: "#007AFF",
	},
	tertiaryButton: {
		backgroundColor: "white",
		borderWidth: 1,
		borderColor: "#e0e0e0",
	},
	primaryButtonText: {
		color: "white",
		fontSize: 18,
		fontWeight: "600",
		marginLeft: 15,
		flex: 1,
	},
	secondaryButtonText: {
		color: "#007AFF",
		fontSize: 18,
		fontWeight: "600",
		marginLeft: 15,
		flex: 1,
	},
	tertiaryButtonText: {
		color: "#333",
		fontSize: 18,
		fontWeight: "600",
		marginLeft: 15,
		flex: 1,
	},
	buttonSubtext: {
		fontSize: 12,
		color: "#999",
		position: "absolute",
		bottom: 6,
		left: 59,
	},
	infoSection: {
		marginTop: 40,
		paddingHorizontal: 20,
		paddingVertical: 20,
		backgroundColor: "white",
		marginHorizontal: 20,
		borderRadius: 12,
	},
	infoTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
		marginBottom: 15,
	},
	infoItem: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
	},
	infoText: {
		fontSize: 14,
		color: "#666",
		marginLeft: 10,
		flex: 1,
	},
});
