import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import AuthScreen from "./src/screens/AuthScreen";
import ChatScreen from "./src/screens/ChatScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import PhoneVerificationScreen from "./src/screens/PhoneVerificationScreen";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View, StyleSheet } from "react-native";

const Stack = createStackNavigator();

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
							name="Chat"
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
		<AuthProvider>
			<StatusBar style="auto" />
			<SafeAreaProvider>
				<AppNavigator />
			</SafeAreaProvider>
		</AuthProvider>
	);
}
