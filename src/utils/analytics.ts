import { getAnalytics, logEvent as firebaseLogEvent } from "firebase/analytics";
import { auth } from "../config/firebase";

// Initialize analytics
let analytics: any = null;

try {
	// Only initialize analytics in production and if analytics is available
	if (__DEV__ === false && typeof getAnalytics !== "undefined") {
		analytics = getAnalytics();
	}
} catch (error) {
	console.log("Analytics not available in this environment");
}

// Event names
export const ANALYTICS_EVENTS = {
	// Authentication Events
	USER_REGISTERED: "user_registered",
	USER_LOGGED_IN: "user_logged_in",
	USER_LOGGED_OUT: "user_logged_out",
	PHONE_VERIFICATION_STARTED: "phone_verification_started",
	PHONE_VERIFICATION_COMPLETED: "phone_verification_completed",

	// Chat Events
	MESSAGE_SENT: "message_sent",
	MESSAGE_COPIED: "message_copied",
	MESSAGE_REPORTED: "message_reported",

	// Profile Events
	PROFILE_UPDATED: "profile_updated",
	USERNAME_CHANGED: "username_changed",

	// App Events
	APP_OPENED: "app_opened",
	SCREEN_VIEW: "screen_view",
} as const;

// Analytics utility functions
export class Analytics {
	static logEvent(eventName: string, parameters?: Record<string, any>) {
		try {
			if (analytics && auth.currentUser) {
				firebaseLogEvent(analytics, eventName, {
					user_id: auth.currentUser.uid,
					timestamp: new Date().toISOString(),
					...parameters,
				});
			}

			// Also log to console in development
			if (__DEV__) {
				console.log(`📊 Analytics: ${eventName}`, parameters);
			}
		} catch (error) {
			console.warn("Analytics error:", error);
		}
	}

	static logScreenView(screenName: string, screenClass?: string) {
		this.logEvent(ANALYTICS_EVENTS.SCREEN_VIEW, {
			screen_name: screenName,
			screen_class: screenClass || screenName,
		});
	}

	static logUserAction(action: string, details?: Record<string, any>) {
		this.logEvent(action, {
			action_type: "user_interaction",
			...details,
		});
	}

	static logError(error: Error, context?: string) {
		this.logEvent("app_error", {
			error_message: error.message,
			error_stack: error.stack,
			context,
			severity: "error",
		});
	}

	static logPerformance(metric: string, value: number, unit: string = "ms") {
		this.logEvent("app_performance", {
			metric_name: metric,
			metric_value: value,
			metric_unit: unit,
		});
	}
}

// Hook for tracking screen views
export const useAnalytics = (screenName: string) => {
	React.useEffect(() => {
		Analytics.logScreenView(screenName);
	}, [screenName]);
};
