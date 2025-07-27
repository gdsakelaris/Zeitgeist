import React from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Alert,
	ActionSheetIOS,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
	addDoc,
	collection,
	serverTimestamp,
	doc,
	deleteDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useNetwork } from "./NetworkProvider";
import { Analytics } from "../utils/analytics";
import { ErrorHandler } from "../utils/errorHandler";
import * as Clipboard from "expo-clipboard";

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

interface MessageActionsProps {
	messageId: string;
	messageText: string;
	isOwnMessage: boolean;
	onClose: () => void;
	onRetry?: () => void;
	onDelete?: () => void;
	messageStatus?: "sending" | "sent" | "failed";
}

export default function MessageActions({
	messageId,
	messageText,
	isOwnMessage,
	onClose,
	onRetry,
	onDelete,
	messageStatus = "sent",
}: MessageActionsProps) {
	const { user } = useAuth();
	const { isConnected } = useNetwork();

	const reportMessage = async (reason: string) => {
		if (!user || !isConnected) {
			Alert.alert("Error", "Please check your connection and try again.");
			return;
		}

		try {
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

			await addDoc(collection(db, "reports"), {
				messageId,
				messageText,
				reportedBy: user.id,
				reportedByUsername: user.username,
				reason,
				timestamp: serverTimestamp(),
				status: "pending",
			});

			Analytics.logEvent("message_reported", {
				reason,
				messageLength: messageText.length,
			});

			Alert.alert(
				"Report Submitted",
				"Thank you for helping keep our community safe.",
				[{ text: "OK", onPress: onClose }]
			);
		} catch (error) {
			console.error("Error reporting message:", error);
			const appError = ErrorHandler.handle(error, "report_message");
			ErrorHandler.showAlert(appError, "Failed to Report Message");
		}
	};

	const showReportOptions = () => {
		const options = [
			"Cancel",
			"Spam",
			"Harassment",
			"Inappropriate Content",
			"Misinformation",
			"Other",
		];

		if (Platform.OS === "ios") {
			ActionSheetIOS.showActionSheetWithOptions(
				{
					options,
					cancelButtonIndex: 0,
					destructiveButtonIndex: undefined,
					title: "Why are you reporting this message?",
					message:
						"Help us keep the community safe by reporting inappropriate content.",
				},
				(buttonIndex) => {
					if (buttonIndex === 0) return; // Cancel

					const reasons = [
						"spam",
						"harassment",
						"inappropriate",
						"misinformation",
						"other",
					];
					const selectedReason = reasons[buttonIndex - 1];
					if (selectedReason) {
						reportMessage(selectedReason);
					}
				}
			);
		} else {
			// Android Alert fallback
			Alert.alert("Report Message", "Why are you reporting this message?", [
				{ text: "Cancel", style: "cancel" },
				{ text: "Spam", onPress: () => reportMessage("spam") },
				{ text: "Harassment", onPress: () => reportMessage("harassment") },
				{
					text: "Inappropriate",
					onPress: () => reportMessage("inappropriate"),
				},
				{
					text: "Misinformation",
					onPress: () => reportMessage("misinformation"),
				},
				{ text: "Other", onPress: () => reportMessage("other") },
			]);
		}
	};

	const copyMessage = async () => {
		try {
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			await Clipboard.setStringAsync(messageText);

			Analytics.logEvent("message_copied", {
				messageLength: messageText.length,
				isOwnMessage,
			});

			Alert.alert("Copied", "Message copied to clipboard", [
				{ text: "OK", onPress: onClose },
			]);
		} catch (error) {
			console.error("Error copying to clipboard:", error);
			ErrorHandler.logAndShow(error, "copy_message", "Failed to Copy");
		}
	};

	const handleRetry = async () => {
		if (onRetry) {
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			Analytics.logEvent("message_retry_attempted", { messageId });
			onRetry();
			onClose();
		}
	};

	const handleClose = async () => {
		await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onClose();
	};

	const handleDelete = async () => {
		if (!onDelete) return;

		Alert.alert(
			"Delete Message",
			"Are you sure you want to delete this message? This action cannot be undone.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						try {
							await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
							await deleteDoc(doc(db, "messages", messageId));
							Analytics.logEvent("message_deleted", { messageId });
							onDelete();
							onClose();
						} catch (error) {
							console.error("Error deleting message:", error);
							const appError = ErrorHandler.handle(error, "delete_message");
							ErrorHandler.showAlert(appError, "Failed to Delete Message");
						}
					},
				},
			]
		);
	};

	return (
		<View style={styles.container}>
			<TouchableOpacity
				style={styles.backdrop}
				onPress={handleClose}
				accessibilityRole="button"
				accessibilityLabel="Close message actions"
			/>
			<View style={styles.actionSheet}>
				<View style={styles.header}>
					<View style={styles.handle} />
					<Text style={styles.headerText}>Message Actions</Text>
				</View>

				{/* Copy Action */}
				<TouchableOpacity
					style={styles.action}
					onPress={copyMessage}
					accessibilityRole="button"
					accessibilityLabel="Copy message to clipboard"
				>
					<Ionicons
						name="copy-outline"
						size={20}
						color="#666"
					/>
					<Text style={styles.actionText}>Copy Message</Text>
				</TouchableOpacity>

				{/* Retry Action for failed messages */}
				{messageStatus === "failed" && onRetry && (
					<TouchableOpacity
						style={styles.action}
						onPress={handleRetry}
						accessibilityRole="button"
						accessibilityLabel="Retry sending message"
					>
						<Ionicons
							name="refresh-outline"
							size={20}
							color="#007AFF"
						/>
						<Text style={[styles.actionText, styles.retryText]}>
							Retry Sending
						</Text>
					</TouchableOpacity>
				)}

				{/* Delete Action for all messages */}
				{onDelete && (
					<TouchableOpacity
						style={styles.action}
						onPress={handleDelete}
						accessibilityRole="button"
						accessibilityLabel="Delete message"
						accessibilityHint="Permanently deletes this message"
					>
						<Ionicons
							name="trash-outline"
							size={20}
							color="#FF3B30"
						/>
						<Text style={[styles.actionText, styles.deleteText]}>
							Delete Message
						</Text>
					</TouchableOpacity>
				)}

				{/* Report Action for other users' messages */}
				{!isOwnMessage && (
					<TouchableOpacity
						style={styles.action}
						onPress={showReportOptions}
						disabled={!isConnected}
						accessibilityRole="button"
						accessibilityLabel="Report this message"
						accessibilityHint="Opens options to report inappropriate content"
					>
						<Ionicons
							name="flag-outline"
							size={20}
							color={isConnected ? "#FF3B30" : "#ccc"}
						/>
						<Text
							style={[
								styles.actionText,
								styles.reportText,
								!isConnected && styles.disabledText,
							]}
						>
							Report Message
						</Text>
						{!isConnected && <Text style={styles.offlineText}>(Offline)</Text>}
					</TouchableOpacity>
				)}

				{/* Cancel Action */}
				<TouchableOpacity
					style={styles.cancelAction}
					onPress={handleClose}
					accessibilityRole="button"
					accessibilityLabel="Cancel"
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
	backdrop: {
		flex: 1,
	},
	actionSheet: {
		backgroundColor: "white",
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingBottom: Platform.OS === "ios" ? 34 : 20,
		elevation: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
	},
	header: {
		alignItems: "center",
		paddingVertical: 16,
		borderBottomWidth: 0.5,
		borderBottomColor: "#e0e0e0",
	},
	handle: {
		width: 36,
		height: 4,
		backgroundColor: "#ddd",
		borderRadius: 2,
		marginBottom: 12,
	},
	headerText: {
		fontSize: 16,
		fontWeight: "600",
		color: "#666",
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
		flex: 1,
	},
	reportText: {
		color: "#FF3B30",
	},
	retryText: {
		color: "#007AFF",
	},
	deleteText: {
		color: "#FF3B30",
	},
	disabledText: {
		color: "#ccc",
	},
	offlineText: {
		fontSize: 12,
		color: "#ccc",
		fontStyle: "italic",
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
