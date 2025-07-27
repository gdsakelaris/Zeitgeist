import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	ReactNode,
} from "react";
import { View, Text, StyleSheet } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import { Analytics } from "../utils/analytics";

interface NetworkState {
	isConnected: boolean;
	isInternetReachable: boolean | null;
	type: string | null;
}

interface NetworkContextType extends NetworkState {
	retryConnection: () => void;
}

const NetworkContext = createContext<NetworkContextType>({
	isConnected: true,
	isInternetReachable: true,
	type: null,
	retryConnection: () => {},
});

interface NetworkProviderProps {
	children: ReactNode;
	showOfflineBanner?: boolean;
}

export function NetworkProvider({
	children,
	showOfflineBanner = true,
}: NetworkProviderProps) {
	const [networkState, setNetworkState] = useState<NetworkState>({
		isConnected: true,
		isInternetReachable: true,
		type: null,
	});

	const [showBanner, setShowBanner] = useState(false);

	useEffect(() => {
		const unsubscribe = NetInfo.addEventListener((state) => {
			const newState = {
				isConnected: state.isConnected ?? false,
				isInternetReachable: state.isInternetReachable,
				type: state.type,
			};

			// Log network changes
			if (networkState.isConnected !== newState.isConnected) {
				Analytics.logEvent(
					newState.isConnected ? "network_online" : "network_offline",
					{
						type: newState.type,
						wasConnected: networkState.isConnected,
					}
				);
			}

			setNetworkState(newState);

			// Show/hide offline banner
			if (showOfflineBanner) {
				setShowBanner(!newState.isConnected);
			}
		});

		return unsubscribe;
	}, [networkState.isConnected, showOfflineBanner]);

	const retryConnection = async () => {
		try {
			const state = await NetInfo.fetch();
			setNetworkState({
				isConnected: state.isConnected ?? false,
				isInternetReachable: state.isInternetReachable,
				type: state.type,
			});
		} catch (error) {
			console.warn("Failed to fetch network state:", error);
		}
	};

	const contextValue: NetworkContextType = {
		...networkState,
		retryConnection,
	};

	return (
		<NetworkContext.Provider value={contextValue}>
			{showBanner && showOfflineBanner && (
				<OfflineBanner onRetry={retryConnection} />
			)}
			{children}
		</NetworkContext.Provider>
	);
}

interface OfflineBannerProps {
	onRetry: () => void;
}

function OfflineBanner({ onRetry }: OfflineBannerProps) {
	return (
		<View style={styles.offlineBanner}>
			<Ionicons
				name="cloud-offline-outline"
				size={16}
				color="white"
			/>
			<Text style={styles.offlineText}>No internet connection</Text>
			<Text
				style={styles.retryText}
				onPress={onRetry}
			>
				Retry
			</Text>
		</View>
	);
}

export function useNetwork() {
	const context = useContext(NetworkContext);
	if (!context) {
		throw new Error("useNetwork must be used within a NetworkProvider");
	}
	return context;
}

// Higher-order component for components that need network awareness
export function withNetworkAwareness<T extends object>(
	Component: React.ComponentType<T>
) {
	const WrappedComponent = (props: T) => {
		const network = useNetwork();

		return (
			<Component
				{...props}
				network={network}
			/>
		);
	};

	WrappedComponent.displayName = `withNetworkAwareness(${
		Component.displayName || Component.name
	})`;

	return WrappedComponent;
}

const styles = StyleSheet.create({
	offlineBanner: {
		backgroundColor: "#FF6B6B",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 8,
		paddingHorizontal: 16,
		gap: 8,
	},
	offlineText: {
		color: "white",
		fontSize: 14,
		fontWeight: "500",
	},
	retryText: {
		color: "white",
		fontSize: 14,
		fontWeight: "600",
		textDecorationLine: "underline",
	},
});
