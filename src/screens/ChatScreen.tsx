import React, {
	useState,
	useEffect,
	useRef,
	useCallback,
	useMemo,
} from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	FlatList,
	StyleSheet,
	Platform,
	Alert,
	ActivityIndicator,
	Modal,
	RefreshControl,
	Animated,
	AccessibilityInfo,
	TouchableWithoutFeedback,
	Keyboard,
	KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
	collection,
	addDoc,
	onSnapshot,
	orderBy,
	query,
	serverTimestamp,
	Timestamp,
	limit,
	limitToLast,
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../config/firebase";
import { Ionicons } from "@expo/vector-icons";
import MessageActions from "../components/MessageActions";
import { useNetwork } from "../components/NetworkProvider";
import { useAnalytics, Analytics } from "../utils/analytics";
import { ErrorHandler } from "../utils/errorHandler";
import { MESSAGE_CONFIG, UI } from "../utils/constants";

// Conditional haptics import
let Haptics: any = null;
try {
	Haptics = require("expo-haptics");
} catch (error) {
	// Haptics not available
	Haptics = {
		impactAsync: () => Promise.resolve(),
		ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
	};
}

interface Message {
	id: string;
	text: string;
	username: string;
	userId: string;
	timestamp: Date;
	status?: "sending" | "sent" | "failed";
}

interface ChatScreenProps {
	navigation: any;
}

const MESSAGE_BATCH_SIZE = 50;
const AUTO_SCROLL_THRESHOLD = 100;

export default function ChatScreen({ navigation }: ChatScreenProps) {
	// Analytics tracking
	useAnalytics("ChatScreen");

	// State management
	const [messages, setMessages] = useState<Message[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const [loading, setLoading] = useState(true);
	const [sending, setSending] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
	const [showActions, setShowActions] = useState(false);
	const [isNearBottom, setIsNearBottom] = useState(true);
	const [hasMoreMessages, setHasMoreMessages] = useState(false);

	// Hooks
	const { user, logout } = useAuth();
	const { isConnected, retryConnection } = useNetwork();

	// Refs
	const flatListRef = useRef<FlatList>(null);
	const messageInputRef = useRef<TextInput>(null);
	const unsubscribeRef = useRef<(() => void) | null>(null);
	const scrollY = useRef(new Animated.Value(0)).current;

	// Memoized values
	const isMessageValid = useMemo(() => {
		return (
			newMessage.trim().length >= MESSAGE_CONFIG.MIN_LENGTH &&
			newMessage.length <= MESSAGE_CONFIG.MAX_LENGTH
		);
	}, [newMessage]);

	// Character count for input
	const characterCount = useMemo(
		() => ({
			current: newMessage.length,
			max: MESSAGE_CONFIG.MAX_LENGTH,
			remaining: MESSAGE_CONFIG.MAX_LENGTH - newMessage.length,
			isNearLimit: newMessage.length > MESSAGE_CONFIG.MAX_LENGTH * 0.8,
		}),
		[newMessage.length]
	);

	// Setup message listener with improved error handling
	useEffect(() => {
		if (!user) return;

		setLoading(true);

		try {
			// Create query for recent messages
			const messagesQuery = query(
				collection(db, "messages"),
				orderBy("timestamp", "desc"),
				limitToLast(MESSAGE_BATCH_SIZE)
			);

			// Subscribe to real-time updates
			const unsubscribe = onSnapshot(
				messagesQuery,
				(snapshot) => {
					const messagesData: Message[] = [];
					snapshot.forEach((doc) => {
						const data = doc.data();
						if (data.timestamp) {
							messagesData.push({
								id: doc.id,
								text: data.text || "",
								username: data.username || "Unknown",
								userId: data.userId || "",
								timestamp: data.timestamp.toDate(),
								status: "sent",
							});
						}
					});

					// Sort messages chronologically (oldest first for display)
					const sortedMessages = messagesData.reverse();
					setMessages(sortedMessages);
					setLoading(false);

					// Auto-scroll to bottom for new messages
					if (isNearBottom && sortedMessages.length > 0) {
						setTimeout(() => {
							scrollToBottom(false);
						}, 100);
					}

					Analytics.logEvent("messages_loaded", {
						count: sortedMessages.length,
					});
				},
				(error) => {
					console.error("Message listener error:", error);
					const appError = ErrorHandler.handle(error, "message_listener");

					if (!isConnected) {
						// Handle offline gracefully
						setLoading(false);
						return;
					}

					ErrorHandler.showRetryAlert(
						appError,
						async () => {
							// Retry logic can be implemented here
							retryConnection();
						},
						"Failed to Load Messages"
					);
					setLoading(false);
				}
			);

			unsubscribeRef.current = unsubscribe;
			return unsubscribe;
		} catch (error) {
			console.error("Failed to setup message listener:", error);
			ErrorHandler.logAndShow(error, "message_listener_setup");
			setLoading(false);
		}
	}, [user, isConnected, isNearBottom, retryConnection]);

	// Cleanup listener on unmount
	useEffect(() => {
		return () => {
			if (unsubscribeRef.current) {
				unsubscribeRef.current();
			}
		};
	}, []);

	// Optimized scroll to bottom function
	const scrollToBottom = useCallback(
		(animated: boolean = true, dismissKeyboard: boolean = false) => {
			if (flatListRef.current && messages.length > 0) {
				flatListRef.current.scrollToEnd({ animated });
			}
			if (dismissKeyboard) {
				Keyboard.dismiss();
			}
		},
		[messages.length]
	);

	// Handle scroll events for auto-scroll logic
	const handleScroll = useCallback((event: any) => {
		const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
		const distanceFromBottom =
			contentSize.height - (contentOffset.y + layoutMeasurement.height);
		setIsNearBottom(distanceFromBottom < AUTO_SCROLL_THRESHOLD);
	}, []);

	// Optimized send message function
	const sendMessage = useCallback(async () => {
		if (!isMessageValid || !user || sending || !isConnected) {
			if (!isConnected) {
				Alert.alert(
					"No Connection",
					"Please check your internet connection and try again."
				);
			}
			return;
		}

		const messageText = newMessage.trim();
		const tempId = `temp_${Date.now()}`;

		// Add temporary message for immediate UI feedback
		const tempMessage: Message = {
			id: tempId,
			text: messageText,
			username: user.username,
			userId: user.id,
			timestamp: new Date(),
			status: "sending",
		};

		setMessages((prev) => [...prev, tempMessage]);
		setNewMessage("");
		setSending(true);

		// Haptic feedback
		await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

		// Scroll to bottom immediately
		setTimeout(() => scrollToBottom(), 50);

		try {
			await addDoc(collection(db, "messages"), {
				text: messageText,
				username: user.username,
				userId: user.id,
				timestamp: serverTimestamp(),
			});

			// Remove temporary message (real message will come through listener)
			setMessages((prev) => prev.filter((msg) => msg.id !== tempId));

			Analytics.logEvent("message_sent", {
				messageLength: messageText.length,
				messageWordCount: messageText.split(" ").length,
			});
		} catch (error: any) {
			console.error("Failed to send message:", error);

			// Update temporary message to failed status
			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === tempId ? { ...msg, status: "failed" } : msg
				)
			);

			const appError = ErrorHandler.handle(error, "send_message");
			ErrorHandler.showRetryAlert(
				appError,
				async () => {
					// Remove failed message and retry
					setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
					setNewMessage(messageText);
					await sendMessage();
				},
				"Failed to Send Message"
			);
		} finally {
			setSending(false);
		}
	}, [isMessageValid, user, sending, isConnected, newMessage, scrollToBottom]);

	// Handle message long press with haptics
	const handleLongPress = useCallback(
		async (message: Message) => {
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			setSelectedMessage(message);
			setShowActions(true);
			Analytics.logEvent("message_long_pressed", {
				isOwnMessage: message.userId === user?.id,
			});
		},
		[user?.id]
	);

	// Optimized message renderer with memoization
	const renderMessage = useCallback(
		({ item, index }: { item: Message; index: number }) => {
			const isOwnMessage = item.userId === user?.id;
			const isLastMessage = index === messages.length - 1;
			const showUsername =
				!isOwnMessage &&
				(index === 0 || messages[index - 1]?.userId !== item.userId);

			return (
				<MessageItem
					message={item}
					isOwnMessage={isOwnMessage}
					showUsername={showUsername}
					isLastMessage={isLastMessage}
					onLongPress={handleLongPress}
				/>
			);
		},
		[user?.id, messages, handleLongPress]
	);

	// Pull to refresh handler
	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			// Implement refresh logic here
			await new Promise((resolve) => setTimeout(resolve, 1000));
			Analytics.logEvent("messages_refreshed");
		} catch (error) {
			console.error("Refresh failed:", error);
		} finally {
			setRefreshing(false);
		}
	}, []);

	// Optimized key extractor
	const keyExtractor = useCallback((item: Message) => item.id, []);

	// Handle logout with confirmation
	const handleLogout = useCallback(() => {
		Alert.alert("Logout", "Are you sure you want to logout?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Logout",
				style: "destructive",
				onPress: () => {
					Analytics.logEvent("user_logged_out", { from: "chat_screen" });
					logout();
				},
			},
		]);
	}, [logout]);

	// Handle keyboard dismissal
	const dismissKeyboard = useCallback(() => {
		Keyboard.dismiss();
	}, []);

	// Handle input focus
	const handleInputFocus = useCallback(() => {
		// Auto-scroll to bottom when input gains focus
		if (isNearBottom && messages.length > 0) {
			scrollToBottom(true);
		}
	}, [isNearBottom, messages.length, scrollToBottom]);

	// Handle retry sending failed message
	const handleRetryMessage = useCallback(
		async (messageId: string) => {
			const failedMessage = messages.find((msg) => msg.id === messageId);
			if (failedMessage) {
				setNewMessage(failedMessage.text);
				setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
				setTimeout(() => sendMessage(), 100);
			}
		},
		[messages, sendMessage]
	);

	// Handle delete message
	const handleDeleteMessage = useCallback(() => {
		// The message will be removed from Firestore by MessageActions
		// The real-time listener will handle updating the local state
		Analytics.logEvent("message_delete_initiated", {
			messageId: selectedMessage?.id,
		});
	}, [selectedMessage?.id]);

	// Loading state
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
		<SafeAreaView
			style={styles.container}
			edges={["top", "bottom"]}
		>
			<KeyboardAvoidingView
				style={styles.keyboardAvoidingView}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={0}
			>
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity
						onPress={() => navigation.navigate("Profile")}
						style={styles.profileButton}
						accessibilityRole="button"
						accessibilityLabel="View profile"
					>
						<View style={styles.avatar}>
							<Text style={styles.avatarText}>
								{user?.username?.charAt(0).toUpperCase()}
							</Text>
						</View>
						<View>
							<Text style={styles.headerTitle}>Zeitgeist</Text>
							<Text style={styles.headerSubtitle}>
								{isConnected ? `Welcome, ${user?.username}` : "Offline"}
							</Text>
						</View>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={handleLogout}
						style={styles.logoutButton}
						accessibilityRole="button"
						accessibilityLabel="Logout"
						accessibilityHint="Logout from your account"
					>
						<Ionicons
							name="log-out-outline"
							size={24}
							color="#FF3B30"
						/>
					</TouchableOpacity>
				</View>

				{/* Messages Container */}
				<View style={styles.messagesContainer}>
					{messages.length === 0 ? (
						<TouchableWithoutFeedback onPress={dismissKeyboard}>
							<View style={styles.emptyStateContainer}>
								<EmptyState />
							</View>
						</TouchableWithoutFeedback>
					) : (
						<TouchableWithoutFeedback onPress={dismissKeyboard}>
							<FlatList
								ref={flatListRef}
								data={messages}
								renderItem={renderMessage}
								keyExtractor={keyExtractor}
								contentContainerStyle={styles.flatListContent}
								showsVerticalScrollIndicator={false}
								onScroll={handleScroll}
								scrollEventThrottle={16}
								removeClippedSubviews={true}
								initialNumToRender={20}
								maxToRenderPerBatch={10}
								windowSize={21}
								getItemLayout={undefined}
								refreshControl={
									<RefreshControl
										refreshing={refreshing}
										onRefresh={handleRefresh}
										colors={["#007AFF"]}
										tintColor="#007AFF"
									/>
								}
								onContentSizeChange={() => {
									if (isNearBottom) {
										scrollToBottom(false);
									}
								}}
							/>
						</TouchableWithoutFeedback>
					)}

					{/* Scroll to bottom button */}
					{!isNearBottom && (
						<TouchableOpacity
							style={styles.scrollToBottomButton}
							onPress={() => scrollToBottom(false, true)}
							accessibilityRole="button"
							accessibilityLabel="Scroll to bottom"
						>
							<Ionicons
								name="chevron-down"
								size={20}
								color="white"
							/>
						</TouchableOpacity>
					)}
				</View>

				{/* Message Input */}
				<MessageInput
					value={newMessage}
					onChangeText={setNewMessage}
					onSend={sendMessage}
					sending={sending}
					isConnected={isConnected}
					characterCount={characterCount}
					ref={messageInputRef}
					onFocus={handleInputFocus}
				/>
			</KeyboardAvoidingView>

			{/* Message Actions Modal */}
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
						onRetry={
							selectedMessage.status === "failed"
								? () => handleRetryMessage(selectedMessage.id)
								: undefined
						}
						onDelete={
							selectedMessage.userId === user?.id
								? () => handleDeleteMessage()
								: undefined
						}
						messageStatus={selectedMessage.status}
					/>
				)}
			</Modal>
		</SafeAreaView>
	);
}

// Memoized Message Item Component
const MessageItem = React.memo(
	({
		message,
		isOwnMessage,
		showUsername,
		isLastMessage,
		onLongPress,
	}: {
		message: Message;
		isOwnMessage: boolean;
		showUsername: boolean;
		isLastMessage: boolean;
		onLongPress: (message: Message) => void;
	}) => {
		const formatTime = (date: Date) => {
			return date.toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
			});
		};

		const getStatusIcon = () => {
			switch (message.status) {
				case "sending":
					return (
						<ActivityIndicator
							size="small"
							color="rgba(255, 255, 255, 0.7)"
						/>
					);
				case "failed":
					return (
						<Ionicons
							name="alert-circle"
							size={12}
							color="#FF6B6B"
						/>
					);
				case "sent":
				default:
					return null;
			}
		};

		return (
			<TouchableOpacity
				onLongPress={() => onLongPress(message)}
				delayLongPress={300}
				style={[
					styles.messageContainer,
					isOwnMessage && styles.ownMessage,
					isLastMessage && styles.lastMessage,
				]}
				accessibilityRole="button"
				accessibilityLabel={`Message from ${
					isOwnMessage ? "you" : message.username
				}: ${message.text}`}
			>
				{showUsername && (
					<Text style={styles.username}>{message.username}</Text>
				)}
				<Text
					style={[styles.messageText, isOwnMessage && styles.ownMessageText]}
				>
					{message.text}
				</Text>
				<View style={styles.messageFooter}>
					<Text style={[styles.timestamp, isOwnMessage && styles.ownTimestamp]}>
						{formatTime(message.timestamp)}
					</Text>
					{isOwnMessage && getStatusIcon()}
				</View>
			</TouchableOpacity>
		);
	}
);

// Empty State Component
const EmptyState = React.memo(() => (
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
));

// Message Input Component
const MessageInput = React.memo(
	React.forwardRef<
		TextInput,
		{
			value: string;
			onChangeText: (text: string) => void;
			onSend: () => void;
			sending: boolean;
			isConnected: boolean;
			characterCount: {
				current: number;
				max: number;
				remaining: number;
				isNearLimit: boolean;
			};
			onFocus: () => void;
		}
	>(
		(
			{
				value,
				onChangeText,
				onSend,
				sending,
				isConnected,
				characterCount,
				onFocus,
			},
			ref
		) => {
			const canSend = value.trim().length > 0 && !sending && isConnected;

			// Handle return key press
			const handleSubmitEditing = useCallback(() => {
				if (canSend) {
					onSend();
				} else {
					Keyboard.dismiss();
				}
			}, [canSend, onSend]);

			// Handle input container press to focus
			const handleInputContainerPress = useCallback(() => {
				if (ref && "current" in ref && ref.current) {
					ref.current.focus();
				}
			}, [ref]);

			return (
				<View style={styles.inputSection}>
					{characterCount.isNearLimit && (
						<Text style={styles.characterCount}>
							{characterCount.remaining} characters remaining
						</Text>
					)}
					<View style={styles.inputRow}>
						<TouchableOpacity
							style={styles.inputContainer}
							onPress={handleInputContainerPress}
							activeOpacity={1}
						>
							<TextInput
								ref={ref}
								style={styles.textInput}
								value={value}
								onChangeText={onChangeText}
								placeholder={
									isConnected ? "Type a message..." : "No connection..."
								}
								placeholderTextColor="#999"
								multiline={true}
								maxLength={characterCount.max}
								editable={!sending && isConnected}
								textAlignVertical="top"
								onSubmitEditing={handleSubmitEditing}
								onFocus={onFocus}
								blurOnSubmit={canSend}
								returnKeyType={canSend ? "send" : "done"}
								enablesReturnKeyAutomatically={true}
								submitBehavior={canSend ? "submit" : "newline"}
								accessibilityLabel="Message input"
								accessibilityHint="Type your message here. Press return to send or dismiss keyboard."
							/>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
							onPress={onSend}
							disabled={!canSend}
							accessibilityRole="button"
							accessibilityLabel="Send message"
							accessibilityState={{ disabled: !canSend }}
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
			);
		}
	)
);

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f5",
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
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
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
	messagesContainer: {
		flex: 1,
		backgroundColor: "#f5f5f5",
	},
	flatListContent: {
		paddingHorizontal: 15,
		paddingTop: 15,
		paddingBottom: 25,
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
	lastMessage: {
		marginBottom: 15,
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
	messageFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 4,
	},
	timestamp: {
		fontSize: 11,
		color: "#999",
	},
	ownTimestamp: {
		color: "rgba(255, 255, 255, 0.7)",
	},
	emptyState: {
		justifyContent: "center",
		alignItems: "center",
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
	emptyStateContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 30,
	},
	scrollToBottomButton: {
		position: "absolute",
		bottom: Platform.OS === "ios" ? 85 : 90,
		right: 20,
		backgroundColor: "#007AFF",
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		elevation: 4,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
	},
	inputSection: {
		backgroundColor: "white",
		borderTopWidth: 1,
		borderTopColor: "#e0e0e0",
		paddingHorizontal: 15,
		paddingTop: 12,
		paddingBottom: Platform.OS === "ios" ? 20 : 15,
		marginBottom: Platform.OS === "ios" ? 0 : 10,
		elevation: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	characterCount: {
		fontSize: 12,
		color: "#666",
		textAlign: "right",
		marginBottom: 5,
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
		paddingVertical: 12,
		maxHeight: 100,
		fontSize: 16,
		backgroundColor: "#f9f9f9",
		minHeight: 42,
	},
	sendButton: {
		backgroundColor: "#007AFF",
		width: 42,
		height: 42,
		borderRadius: 21,
		justifyContent: "center",
		alignItems: "center",
	},
	sendButtonDisabled: {
		backgroundColor: "#ccc",
	},
	inputContainer: {
		flex: 1,
		marginRight: 10,
	},
	keyboardAvoidingView: {
		flex: 1,
	},
});
