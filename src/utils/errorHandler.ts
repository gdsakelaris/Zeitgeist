import { Alert } from "react-native";
import { Analytics } from "./analytics";
import { ERROR_MESSAGES } from "./constants";

export interface AppError {
	code: string;
	message: string;
	details?: any;
	context?: string;
}

export class ErrorHandler {
	static handle(error: any, context?: string): AppError {
		let appError: AppError;

		// Handle Firebase errors
		if (error?.code) {
			appError = this.handleFirebaseError(error);
		}
		// Handle network errors
		else if (
			error?.message?.includes("network") ||
			error?.name === "NetworkError"
		) {
			appError = {
				code: "NETWORK_ERROR",
				message: ERROR_MESSAGES.NETWORK,
				details: error,
				context,
			};
		}
		// Handle generic errors
		else {
			appError = {
				code: "GENERIC_ERROR",
				message: ERROR_MESSAGES.GENERIC,
				details: error,
				context,
			};
		}

		// Log error for analytics
		Analytics.logError(new Error(appError.message), context);

		return appError;
	}

	static handleFirebaseError(error: any): AppError {
		const errorMap: Record<string, string> = {
			// Auth errors
			"auth/invalid-phone-number": "Invalid phone number format.",
			"auth/missing-phone-number": "Phone number is required.",
			"auth/quota-exceeded": "SMS quota exceeded. Please try again later.",
			"auth/invalid-verification-code": "Invalid verification code.",
			"auth/code-expired": "Verification code has expired.",
			"auth/too-many-requests": "Too many requests. Please try again later.",
			"auth/user-disabled":
				"Your account has been disabled. Please contact support.",
			"auth/operation-not-allowed": "This operation is not allowed.",

			// Firestore errors
			"permission-denied": ERROR_MESSAGES.PERMISSION_DENIED,
			unavailable: "Service temporarily unavailable. Please try again.",
			"deadline-exceeded": "Request timeout. Please try again.",
			"resource-exhausted": ERROR_MESSAGES.RATE_LIMITED,
			unauthenticated: "Please log in to continue.",
			"invalid-argument": ERROR_MESSAGES.INVALID_INPUT,

			// Storage errors
			"storage/unauthorized": "Unauthorized access to storage.",
			"storage/canceled": "Upload canceled.",
			"storage/unknown": "Unknown storage error occurred.",
		};

		return {
			code: error.code,
			message: errorMap[error.code] || ERROR_MESSAGES.GENERIC,
			details: error,
		};
	}

	static showAlert(error: AppError, title: string = "Error") {
		Alert.alert(title, error.message, [{ text: "OK" }]);
	}

	static async showRetryAlert(
		error: AppError,
		onRetry: () => Promise<void>,
		title: string = "Error"
	): Promise<void> {
		return new Promise((resolve) => {
			Alert.alert(title, error.message, [
				{ text: "Cancel", style: "cancel", onPress: () => resolve() },
				{
					text: "Retry",
					onPress: async () => {
						try {
							await onRetry();
						} catch (retryError) {
							this.handle(retryError, "retry_failed");
						}
						resolve();
					},
				},
			]);
		});
	}

	static logAndShow(error: any, context?: string, title?: string) {
		const appError = this.handle(error, context);
		this.showAlert(appError, title);
		return appError;
	}
}
