import React, { useState, useCallback, useMemo } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	FlatList,
	StyleSheet,
	SafeAreaView,
	ActivityIndicator,
	Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
	collection,
	query,
	where,
	getDocs,
	orderBy,
	limit,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useNetwork } from "../components/NetworkProvider";
import { useAnalytics, Analytics } from "../utils/analytics";
import { InputSanitizer } from "../utils/inputSanitizer";
import { ErrorHandler } from "../utils/errorHandler";

interface SearchedUser {
	id: string;
	username: string;
	phoneNumber?: string;
	createdAt?: Date;
}

interface UserSearchScreenProps {
	navigation: any;
}

export default function UserSearchScreen({
	navigation,
}: UserSearchScreenProps) {
	// Analytics tracking
	useAnalytics("UserSearchScreen");

	// State management
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
	const [searching, setSearching] = useState(false);
	const [hasSearched, setHasSearched] = useState(false);

	// Hooks
	const { user } = useAuth();
	const { isConnected } = useNetwork();

	// Debounced search function
	const searchUsers = useCallback(
		async (searchTerm: string) => {
			if (!searchTerm.trim() || !isConnected) return;

			const sanitizedQuery = InputSanitizer.sanitizeUsername(searchTerm);
			if (!sanitizedQuery || sanitizedQuery.length < 2) return;

			setSearching(true);
			setHasSearched(true);

			try {
				// Search for users whose username starts with the query
				const usersQuery = query(
					collection(db, "users"),
					where("username", ">=", sanitizedQuery),
					where("username", "<=", sanitizedQuery + "\uf8ff"),
					orderBy("username"),
					limit(20)
				);

				const snapshot = await getDocs(usersQuery);
				const users: SearchedUser[] = [];

				snapshot.forEach((doc) => {
					const data = doc.data();
					users.push({
						id: doc.id,
						username: data.username || "Unknown",
						phoneNumber: data.phoneNumber,
						createdAt: data.createdAt?.toDate(),
					});
				});

				setSearchResults(users);

				Analytics.logEvent("user_search_performed", {
					query: sanitizedQuery,
					resultsCount: users.length,
				});
			} catch (error) {
				console.error("Error searching users:", error);
				const appError = ErrorHandler.handle(error, "user_search");
				ErrorHandler.showAlert(appError, "Search Error");
			} finally {
				setSearching(false);
			}
		},
		[isConnected]
	);

	// Handle search input with debouncing
	const handleSearchInput = useCallback(
		(text: string) => {
			setSearchQuery(text);

			// Simple debouncing
			const timeoutId = setTimeout(() => {
				if (text.length >= 2) {
					searchUsers(text);
				} else {
					setSearchResults([]);
					setHasSearched(false);
				}
			}, 500);

			return () => clearTimeout(timeoutId);
		},
		[searchUsers]
	);

	// Navigate to user's page
	const visitUserPage = useCallback(
		(selectedUser: SearchedUser) => {
			Analytics.logEvent("user_page_visited", {
				visitedUserId: selectedUser.id,
				visitedUsername: selectedUser.username,
			});

			navigation.navigate("UserPage", {
				userId: selectedUser.id,
				username: selectedUser.username,
				isOwnPage: selectedUser.id === user?.id,
			});
		},
		[navigation, user?.id]
	);

	// Navigate to own page
	const goToMyPage = useCallback(() => {
		if (user) {
			navigation.navigate("UserPage", {
				userId: user.id,
				username: user.username,
				isOwnPage: true,
			});
		}
	}, [navigation, user]);

	// Render user item
	const renderUserItem = useCallback(
		({ item }: { item: SearchedUser }) => {
			const isOwnUser = item.id === user?.id;

			return (
				<TouchableOpacity
					style={[styles.userItem, isOwnUser && styles.ownUserItem]}
					onPress={() => visitUserPage(item)}
					accessibilityRole="button"
					accessibilityLabel={`Visit ${item.username}'s page`}
				>
					<View style={styles.avatar}>
						<Text style={styles.avatarText}>
							{item.username.charAt(0).toUpperCase()}
						</Text>
					</View>
					<View style={styles.userInfo}>
						<Text style={styles.username}>
							{item.username}
							{isOwnUser && <Text style={styles.youLabel}> (You)</Text>}
						</Text>
						{item.createdAt && (
							<Text style={styles.joinDate}>
								Joined {item.createdAt.toLocaleDateString()}
							</Text>
						)}
					</View>
					<Ionicons
						name="chevron-forward"
						size={20}
						color="#999"
					/>
				</TouchableOpacity>
			);
		},
		[user?.id, visitUserPage]
	);

	// Key extractor
	const keyExtractor = useCallback((item: SearchedUser) => item.id, []);

	// Empty state component
	const EmptyState = useMemo(() => {
		if (searching) {
			return (
				<View style={styles.emptyState}>
					<ActivityIndicator
						size="large"
						color="#007AFF"
					/>
					<Text style={styles.emptyStateText}>Searching users...</Text>
				</View>
			);
		}

		if (hasSearched && searchResults.length === 0) {
			return (
				<View style={styles.emptyState}>
					<Ionicons
						name="person-outline"
						size={64}
						color="#ccc"
					/>
					<Text style={styles.emptyStateText}>No users found</Text>
					<Text style={styles.emptyStateSubtext}>
						Try searching for a different username
					</Text>
				</View>
			);
		}

		return (
			<View style={styles.emptyState}>
				<Ionicons
					name="search-outline"
					size={64}
					color="#ccc"
				/>
				<Text style={styles.emptyStateText}>Discover Users</Text>
				<Text style={styles.emptyStateSubtext}>
					Search for users by their username to visit their pages
				</Text>
			</View>
		);
	}, [searching, hasSearched, searchResults.length]);

	return (
		<SafeAreaView style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					onPress={() => navigation.goBack()}
					style={styles.backButton}
					accessibilityRole="button"
					accessibilityLabel="Go back"
				>
					<Ionicons
						name="arrow-back"
						size={24}
						color="#007AFF"
					/>
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Find Users</Text>
				<TouchableOpacity
					onPress={goToMyPage}
					style={styles.myPageButton}
					accessibilityRole="button"
					accessibilityLabel="Go to my page"
				>
					<Ionicons
						name="person"
						size={24}
						color="#007AFF"
					/>
				</TouchableOpacity>
			</View>

			{/* Search Input */}
			<View style={styles.searchContainer}>
				<View style={styles.searchInputContainer}>
					<Ionicons
						name="search"
						size={20}
						color="#999"
						style={styles.searchIcon}
					/>
					<TextInput
						style={styles.searchInput}
						placeholder="Search username..."
						placeholderTextColor="#999"
						value={searchQuery}
						onChangeText={handleSearchInput}
						autoCapitalize="none"
						autoCorrect={false}
						returnKeyType="search"
						editable={isConnected}
						accessibilityLabel="Search users"
						accessibilityHint="Type a username to search for users"
					/>
					{searchQuery.length > 0 && (
						<TouchableOpacity
							onPress={() => {
								setSearchQuery("");
								setSearchResults([]);
								setHasSearched(false);
							}}
							style={styles.clearButton}
							accessibilityRole="button"
							accessibilityLabel="Clear search"
						>
							<Ionicons
								name="close-circle"
								size={20}
								color="#999"
							/>
						</TouchableOpacity>
					)}
				</View>
				{!isConnected && (
					<Text style={styles.offlineText}>
						Connect to internet to search users
					</Text>
				)}
			</View>

			{/* Search Results */}
			<View style={styles.resultsContainer}>
				{searchResults.length > 0 ? (
					<FlatList
						data={searchResults}
						renderItem={renderUserItem}
						keyExtractor={keyExtractor}
						showsVerticalScrollIndicator={false}
						contentContainerStyle={styles.resultsList}
						ItemSeparatorComponent={() => <View style={styles.separator} />}
					/>
				) : (
					EmptyState
				)}
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
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
	},
	backButton: {
		padding: 5,
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#333",
	},
	myPageButton: {
		padding: 5,
	},
	searchContainer: {
		backgroundColor: "white",
		paddingHorizontal: 20,
		paddingVertical: 15,
		borderBottomWidth: 1,
		borderBottomColor: "#e0e0e0",
	},
	searchInputContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f8f8f8",
		borderRadius: 25,
		paddingHorizontal: 15,
		height: 50,
	},
	searchIcon: {
		marginRight: 10,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: "#333",
	},
	clearButton: {
		marginLeft: 10,
	},
	offlineText: {
		fontSize: 12,
		color: "#FF6B6B",
		textAlign: "center",
		marginTop: 8,
	},
	resultsContainer: {
		flex: 1,
	},
	resultsList: {
		padding: 15,
	},
	userItem: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "white",
		padding: 15,
		borderRadius: 12,
		marginBottom: 8,
		elevation: 1,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
	},
	ownUserItem: {
		borderWidth: 2,
		borderColor: "#007AFF",
		backgroundColor: "#F0F8FF",
	},
	avatar: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: "#007AFF",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 15,
	},
	avatarText: {
		color: "white",
		fontSize: 18,
		fontWeight: "600",
	},
	userInfo: {
		flex: 1,
	},
	username: {
		fontSize: 16,
		fontWeight: "600",
		color: "#333",
	},
	youLabel: {
		fontSize: 14,
		fontWeight: "400",
		color: "#007AFF",
	},
	joinDate: {
		fontSize: 12,
		color: "#666",
		marginTop: 2,
	},
	separator: {
		height: 1,
		backgroundColor: "#f0f0f0",
		marginVertical: 4,
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
		textAlign: "center",
	},
	emptyStateSubtext: {
		fontSize: 14,
		color: "#999",
		marginTop: 5,
		textAlign: "center",
		lineHeight: 20,
	},
});
