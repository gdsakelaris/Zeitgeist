import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import * as Clipboard from "expo-clipboard";

interface MessageActionsProps {
	messageId: string;
	messageText: string;
	isOwnMessage: boolean;
	onClose: () => void;
}

export default function MessageActions({
	messageId,
	messageText,
	isOwnMessage,
	onClose,
}: MessageActionsProps) {
	const { user } = useAuth();

	const reportMessage = async (reason: string) => {
		if (!user) return;

		try {
			await addDoc(collection(db, "reports"), {
				messageId,
				messageText,
				reportedBy: user.id,
				reason,
				timestamp: serverTimestamp(),
				status: "pending",
			});

			Alert.alert(
				"Report Submitted",
				"Thank you for helping keep our community safe."
			);
			onClose();
		} catch (error) {
			console.error("Error reporting message:", error);
			Alert.alert("Error", "Failed to submit report. Please try again.");
		}
	};

	const showReportOptions = () => {
		Alert.alert("Report Message", "Why are you reporting this message?", [
			{ text: "Cancel", style: "cancel" },
			{ text: "Spam", onPress: () => reportMessage("spam") },
			{ text: "Harassment", onPress: () => reportMessage("harassment") },
			{
				text: "Inappropriate Content",
				onPress: () => reportMessage("inappropriate"),
			},
			{ text: "Other", onPress: () => reportMessage("other") },
		]);
	};

	const copyMessage = async () => {
		try {
			await Clipboard.setStringAsync(messageText);
			Alert.alert("Copied", "Message copied to clipboard");
			onClose();
		} catch (error) {
			console.error("Error copying to clipboard:", error);
			Alert.alert("Error", "Failed to copy message");
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.actionSheet}>
				<TouchableOpacity
					style={styles.action}
					onPress={copyMessage}
				>
					<Ionicons
						name="copy-outline"
						size={20}
						color="#666"
					/>
					<Text style={styles.actionText}>Copy Message</Text>
				</TouchableOpacity>

				{!isOwnMessage && (
					<TouchableOpacity
						style={styles.action}
						onPress={showReportOptions}
					>
						<Ionicons
							name="flag-outline"
							size={20}
							color="#FF3B30"
						/>
						<Text style={[styles.actionText, styles.reportText]}>
							Report Message
						</Text>
					</TouchableOpacity>
				)}

				<TouchableOpacity
					style={styles.cancelAction}
					onPress={onClose}
				>
					<Text style={styles.cancelText}>Cancel</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "flex-end",
	},
	actionSheet: {
		backgroundColor: "white",
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingBottom: 34,
	},
	action: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 16,
		paddingHorizontal: 20,
		borderBottomWidth: 0.5,
		borderBottomColor: "#e0e0e0",
	},
	actionText: {
		marginLeft: 12,
		fontSize: 16,
		color: "#333",
	},
	reportText: {
		color: "#FF3B30",
	},
	cancelAction: {
		alignItems: "center",
		paddingVertical: 16,
		marginTop: 8,
	},
	cancelText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#007AFF",
	},
});
