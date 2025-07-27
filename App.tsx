import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import AuthScreen from "./src/screens/AuthScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ChatScreen from "./src/screens/ChatScreen";
import UserSearchScreen from "./src/screens/UserSearchScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import PhoneVerificationScreen from "./src/screens/PhoneVerificationScreen";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { NetworkProvider } from "./src/components/NetworkProvider";

// Define navigation parameter types
export type RootStackParamList = {
	Home: undefined;
	UserSearch: undefined;
	UserPage: {
		userId: string;
		username: string;
		isOwnPage: boolean;
	};
	Profile: undefined;
	Auth: undefined;
	PhoneVerification: {
		verificationId: string;
		phoneNumber: string;
		username: string;
		password: string;
	};
};

const Stack = createStackNavigator<RootStackParamList>();

function AppNavigator() {
	const { user, loading } = useAuth();

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator
					size="large"
					color="#007AFF"
				/>
			</View>
		);
	}

	return (
		<NavigationContainer>
			<Stack.Navigator screenOptions={{ headerShown: false }}>
				{user ? (
					// User is authenticated
					<>
						<Stack.Screen
							name="Home"
							component={HomeScreen}
						/>
						<Stack.Screen
							name="UserSearch"
							component={UserSearchScreen}
						/>
						<Stack.Screen
							name="UserPage"
							component={ChatScreen}
						/>
						<Stack.Screen
							name="Profile"
							component={ProfileScreen}
						/>
					</>
				) : (
					// User is not authenticated
					<>
						<Stack.Screen
							name="Auth"
							component={AuthScreen}
						/>
						<Stack.Screen
							name="PhoneVerification"
							component={PhoneVerificationScreen}
						/>
					</>
				)}
			</Stack.Navigator>
		</NavigationContainer>
	);
}

const styles = StyleSheet.create({
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#f5f5f5",
	},
});

export default function App() {
	return (
		<ErrorBoundary>
			<NetworkProvider>
				<AuthProvider>
					<StatusBar style="auto" />
					<SafeAreaProvider>
						<AppNavigator />
					</SafeAreaProvider>
				</AuthProvider>
			</NetworkProvider>
		</ErrorBoundary>
	);
}
