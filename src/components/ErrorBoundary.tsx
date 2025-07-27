import React, { Component, ReactNode } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Analytics } from "../utils/analytics";
import { ErrorHandler } from "../utils/errorHandler";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: any) => void;
}

interface State {
	hasError: boolean;
	error: Error | null;
	errorInfo: any;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		};
	}

	static getDerivedStateFromError(error: Error): State {
		// Update state so the next render will show the fallback UI
		return {
			hasError: true,
			error,
			errorInfo: null,
		};
	}

	componentDidCatch(error: Error, errorInfo: any) {
		// Log the error
		console.error("ErrorBoundary caught an error:", error, errorInfo);

		// Update state with error info
		this.setState({
			error,
			errorInfo,
		});

		// Log to analytics
		Analytics.logError(error, "error_boundary");

		// Call custom error handler if provided
		if (this.props.onError) {
			this.props.onError(error, errorInfo);
		}

		// Handle error with ErrorHandler
		ErrorHandler.handle(error, "error_boundary");
	}

	handleRetry = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
	};

	render() {
		if (this.state.hasError) {
			// Custom fallback UI
			if (this.props.fallback) {
				return this.props.fallback;
			}

			// Default error UI
			return (
				<SafeAreaView style={styles.container}>
					<View style={styles.errorContainer}>
						<Ionicons
							name="alert-circle-outline"
							size={64}
							color="#FF6B6B"
							style={styles.errorIcon}
						/>
						<Text style={styles.errorTitle}>Oops! Something went wrong</Text>
						<Text style={styles.errorMessage}>
							We encountered an unexpected error. This has been reported and
							we're working on it.
						</Text>

						{__DEV__ && this.state.error && (
							<View style={styles.debugContainer}>
								<Text style={styles.debugTitle}>Debug Info:</Text>
								<Text style={styles.debugText}>{this.state.error.message}</Text>
								{this.state.errorInfo && (
									<Text style={styles.debugText}>
										{this.state.errorInfo.componentStack}
									</Text>
								)}
							</View>
						)}

						<View style={styles.buttonContainer}>
							<TouchableOpacity
								style={styles.retryButton}
								onPress={this.handleRetry}
							>
								<Ionicons
									name="refresh-outline"
									size={20}
									color="white"
									style={styles.buttonIcon}
								/>
								<Text style={styles.retryButtonText}>Try Again</Text>
							</TouchableOpacity>
						</View>
					</View>
				</SafeAreaView>
			);
		}

		return this.props.children;
	}
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<T extends object>(
	Component: React.ComponentType<T>,
	errorFallback?: ReactNode
) {
	const WrappedComponent = (props: T) => (
		<ErrorBoundary fallback={errorFallback}>
			<Component {...props} />
		</ErrorBoundary>
	);

	WrappedComponent.displayName = `withErrorBoundary(${
		Component.displayName || Component.name
	})`;

	return WrappedComponent;
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f5",
	},
	errorContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 30,
	},
	errorIcon: {
		marginBottom: 20,
	},
	errorTitle: {
		fontSize: 24,
		fontWeight: "bold",
		color: "#333",
		textAlign: "center",
		marginBottom: 10,
	},
	errorMessage: {
		fontSize: 16,
		color: "#666",
		textAlign: "center",
		lineHeight: 24,
		marginBottom: 30,
	},
	debugContainer: {
		backgroundColor: "#f8f8f8",
		padding: 15,
		borderRadius: 8,
		marginBottom: 20,
		width: "100%",
		maxHeight: 200,
	},
	debugTitle: {
		fontSize: 14,
		fontWeight: "bold",
		color: "#666",
		marginBottom: 10,
	},
	debugText: {
		fontSize: 12,
		color: "#888",
		fontFamily: "monospace",
	},
	buttonContainer: {
		flexDirection: "row",
		gap: 15,
	},
	retryButton: {
		backgroundColor: "#007AFF",
		paddingHorizontal: 30,
		paddingVertical: 15,
		borderRadius: 25,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
	},
	buttonIcon: {
		marginRight: 8,
	},
	retryButtonText: {
		color: "white",
		fontSize: 16,
		fontWeight: "600",
	},
});
