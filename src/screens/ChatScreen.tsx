import React, { useState, useEffect, useRef } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	FlatList,
	StyleSheet,
	SafeAreaView,
	KeyboardAvoidingView,
	Platform,
	Alert,
	ActivityIndicator,
	Modal,
} from "react-native";
import {
	collection,
	addDoc,
	onSnapshot,
	orderBy,
	query,
	serverTimestamp,
	Timestamp,
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../config/firebase";
import { Ionicons } from "@expo/vector-icons";
import MessageActions from "../components/MessageActions";

interface Message {
	id: string;
	text: string;
	username: string;
	userId: string;
	timestamp: Date;
}

export default function ChatScreen({ navigation }: { navigation: any }) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
	const [showActions, setShowActions] = useState(false);
	const { user, logout } = useAuth();
	const flatListRef = useRef<FlatList>(null);

	useEffect(() => {
		if (!user) return;

		// Create query for messages ordered by timestamp
		const messagesQuery = query(
			collection(db, "messages"),
			orderBy("timestamp", "asc")
		);

		// Subscribe to real-time updates
		const unsubscribe = onSnapshot(
			messagesQuery,
			(snapshot) => {
				const messagesData: Message[] = [];
				snapshot.forEach((doc) => {
					const data = doc.data();
					messagesData.push({
						id: doc.id,
						text: data.text,
						username: data.username,
						userId: data.userId,
						timestamp: data.timestamp?.toDate() || new Date(),
					});
				});
				setMessages(messagesData);
				setLoading(false);

				// Auto-scroll to bottom when new messages arrive
				setTimeout(() => {
					flatListRef.current?.scrollToEnd({ animated: true });
				}, 100);
			},
			(error) => {
				console.error("Error fetching messages:", error);
				Alert.alert("Error", "Failed to load messages");
				setLoading(false);
			}
		);

		return unsubscribe;
	}, [user]);

	const sendMessage = async () => {
		if (!newMessage.trim() || !user || sending) {
			console.log("Send message blocked:", {
				hasMessage: !!newMessage.trim(),
				hasUser: !!user,
				isSending: sending,
			});
			return;
		}

		console.log("Attempting to send message:", {
			text: newMessage.trim(),
			username: user.username,
			userId: user.id,
		});

		setSending(true);
		try {
			await addDoc(collection(db, "messages"), {
				text: newMessage.trim(),
				username: user.username,
				userId: user.id,
				timestamp: serverTimestamp(),
			});

			console.log("Message sent successfully!");
			setNewMessage("");
		} catch (error: any) {
			console.error("Error sending message:", error);
			Alert.alert(
				"Error",
				`Failed to send message: ${error.message}\n\nPlease check your Firestore security rules.`
			);
		} finally {
			setSending(false);
		}
	};

	const formatTime = (date: Date) => {
		return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	};

	const handleLongPress = (message: Message) => {
		setSelectedMessage(message);
		setShowActions(true);
	};

	const renderMessage = ({ item }: { item: Message }) => {
		const isOwnMessage = item.userId === user?.id;

		return (
			<TouchableOpacity
				onLongPress={() => handleLongPress(item)}
				delayLongPress={300}
				style={[styles.messageContainer, isOwnMessage && styles.ownMessage]}
			>
				{!isOwnMessage && <Text style={styles.username}>{item.username}</Text>}
				<Text
					style={[styles.messageText, isOwnMessage && styles.ownMessageText]}
				>
					{item.text}
				</Text>
				<Text style={[styles.timestamp, isOwnMessage && styles.ownTimestamp]}>
					{formatTime(item.timestamp)}
				</Text>
			</TouchableOpacity>
		);
	};

	const handleLogout = () => {
		Alert.alert("Logout", "Are you sure you want to logout?", [
			{ text: "Cancel", style: "cancel" },
			{ text: "Logout", style: "destructive", onPress: logout },
		]);
	};

	if (loading) {
		return (
			<View style={[styles.container, styles.centered]}>
				<ActivityIndicator
					size="large"
					color="#007AFF"
				/>
				<Text style={styles.loadingText}>Loading messages...</Text>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => navigation.navigate("Profile")}
					style={styles.profileButton}
				>
					<View style={styles.avatar}>
						<Text style={styles.avatarText}>
							{user?.username?.charAt(0).toUpperCase()}
						</Text>
					</View>
					<View>
						<Text style={styles.headerTitle}>Zeitgeist</Text>
						<Text style={styles.headerSubtitle}>Welcome, {user?.username}</Text>
					</View>
				</TouchableOpacity>
				<TouchableOpacity
					onPress={() => navigation.navigate("Profile")}
					style={styles.logoutButton}
				>
					<Ionicons
						name="settings-outline"
						size={24}
						color="#007AFF"
					/>
				</TouchableOpacity>
			</View>

			<View style={styles.messagesContainer}>
				{messages.length === 0 ? (
					<View style={styles.emptyState}>
						<Ionicons
							name="chatbubbles-outline"
							size={64}
							color="#ccc"
						/>
						<Text style={styles.emptyStateText}>No messages yet</Text>
						<Text style={styles.emptyStateSubtext}>
							Be the first to start the conversation!
						</Text>
					</View>
				) : (
					<FlatList
						ref={flatListRef}
						data={messages}
						renderItem={renderMessage}
						keyExtractor={(item) => item.id}
						contentContainerStyle={styles.flatListContent}
						showsVerticalScrollIndicator={true}
						scrollEnabled={true}
						removeClippedSubviews={false}
						initialNumToRender={20}
						maxToRenderPerBatch={10}
						windowSize={10}
						getItemLayout={undefined}
						onContentSizeChange={() => {
							if (messages.length > 0) {
								flatListRef.current?.scrollToEnd({ animated: false });
							}
						}}
					/>
				)}
			</View>

			<View style={styles.inputSection}>
				<View style={styles.inputRow}>
					<TextInput
						style={styles.textInput}
						value={newMessage}
						onChangeText={setNewMessage}
						placeholder="Type a message..."
						multiline
						maxLength={500}
						editable={!sending}
					/>
					<TouchableOpacity
						style={[
							styles.sendButton,
							(!newMessage.trim() || sending) && styles.sendButtonDisabled,
						]}
						onPress={sendMessage}
						disabled={!newMessage.trim() || sending}
					>
						{sending ? (
							<ActivityIndicator
								size="small"
								color="white"
							/>
						) : (
							<Ionicons
								name="send"
								size={20}
								color="white"
							/>
						)}
					</TouchableOpacity>
				</View>
			</View>

			<Modal
				visible={showActions}
				transparent={true}
				animationType="fade"
				onRequestClose={() => setShowActions(false)}
			>
				{selectedMessage && (
					<MessageActions
						messageId={selectedMessage.id}
						messageText={selectedMessage.text}
						isOwnMessage={selectedMessage.userId === user?.id}
						onClose={() => setShowActions(false)}
					/>
				)}
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f5",
		paddingTop: Platform.OS === "ios" ? 44 : 0, // StatusBar height
	},
	centered: {
		justifyContent: "center",
		alignItems: "center",
	},
	loadingText: {
		marginTop: 10,
		fontSize: 16,
		color: "#666",
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
	profileButton: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
	},
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "#007AFF",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
	},
	avatarText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: "bold",
		color: "#333",
	},
	headerSubtitle: {
		fontSize: 12,
		color: "#666",
		marginTop: 2,
	},
	logoutButton: {
		padding: 5,
	},
	emptyState: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 30,
	},
	emptyStateText: {
		fontSize: 18,
		fontWeight: "600",
		color: "#666",
		marginTop: 15,
	},
	emptyStateSubtext: {
		fontSize: 14,
		color: "#999",
		marginTop: 5,
		textAlign: "center",
	},
	messagesContainer: {
		flex: 1,
		backgroundColor: "#f5f5f5",
	},
	flatListContent: {
		paddingHorizontal: 15,
		paddingTop: 15,
		paddingBottom: 15,
		flexGrow: 1,
	},
	messageContainer: {
		backgroundColor: "white",
		padding: 12,
		marginBottom: 8,
		borderRadius: 12,
		maxWidth: "80%",
		alignSelf: "flex-start",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	ownMessage: {
		backgroundColor: "#007AFF",
		alignSelf: "flex-end",
	},
	username: {
		fontSize: 12,
		fontWeight: "600",
		color: "#666",
		marginBottom: 2,
	},
	messageText: {
		fontSize: 16,
		color: "#333",
		lineHeight: 20,
	},
	ownMessageText: {
		color: "white",
	},
	timestamp: {
		fontSize: 11,
		color: "#999",
		marginTop: 4,
		alignSelf: "flex-end",
	},
	ownTimestamp: {
		color: "rgba(255, 255, 255, 0.7)",
	},
	inputSection: {
		backgroundColor: "white",
		borderTopWidth: 1,
		borderTopColor: "#e0e0e0",
		padding: 15,
	},
	inputRow: {
		flexDirection: "row",
		alignItems: "flex-end",
	},
	textInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: "#ddd",
		borderRadius: 20,
		paddingHorizontal: 15,
		paddingVertical: 10,
		marginRight: 10,
		maxHeight: 100,
		fontSize: 16,
		backgroundColor: "#f9f9f9",
	},
	sendButton: {
		backgroundColor: "#007AFF",
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	sendButtonDisabled: {
		backgroundColor: "#ccc",
	},
});
