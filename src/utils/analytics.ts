import React from "react";
import { getAnalytics, logEvent as firebaseLogEvent } from "firebase/analytics";
import { auth } from "../config/firebase";

// Initialize analytics safely
let analytics: any = null;

try {
	// Only initialize analytics in production and if analytics is available
	if (!__DEV__ && typeof getAnalytics !== "undefined") {
		analytics = getAnalytics();
	}
} catch (error) {
	if (__DEV__) {
		console.log("Analytics not available in this environment");
	}
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
	MESSAGE_DELETED: "message_deleted",
	CHAT_OPENED: "chat_opened",
	MESSAGE_LONG_PRESSED: "message_long_pressed",

	// Profile Events
	PROFILE_UPDATED: "profile_updated",
	USERNAME_CHANGED: "username_changed",
	PROFILE_VIEWED: "profile_viewed",

	// App Events
	APP_OPENED: "app_opened",
	SCREEN_VIEW: "screen_view",
	APP_ERROR: "app_error",
	NETWORK_ERROR: "network_error",
	PERFORMANCE_METRIC: "performance_metric",
} as const;

// Analytics utility functions
export class Analytics {
	/**
	 * Log a custom event with optional parameters
	 */
	static logEvent(eventName: string, parameters?: Record<string, any>) {
		try {
			if (analytics && auth.currentUser) {
				firebaseLogEvent(analytics, eventName, {
					user_id: auth.currentUser.uid,
					timestamp: new Date().toISOString(),
					...parameters,
				});
			}

			// Log to console in development only
			if (__DEV__) {
				console.log(`📊 Analytics: ${eventName}`, parameters);
			}
		} catch (error) {
			if (__DEV__) {
				console.warn("Analytics error:", error);
			}
		}
	}

	/**
	 * Log screen view events
	 */
	static logScreenView(screenName: string, screenClass?: string) {
		this.logEvent(ANALYTICS_EVENTS.SCREEN_VIEW, {
			screen_name: screenName,
			screen_class: screenClass || screenName,
		});
	}

	/**
	 * Log user interaction events
	 */
	static logUserAction(action: string, details?: Record<string, any>) {
		this.logEvent(action, {
			action_type: "user_interaction",
			...details,
		});
	}

	/**
	 * Log error events with context
	 */
	static logError(error: Error, context?: string) {
		this.logEvent(ANALYTICS_EVENTS.APP_ERROR, {
			error_message: error.message,
			error_stack: __DEV__ ? error.stack : undefined, // Don't send stack traces in production
			context,
			severity: "error",
		});
	}

	/**
	 * Log performance metrics
	 */
	static logPerformance(metric: string, value: number, unit: string = "ms") {
		this.logEvent(ANALYTICS_EVENTS.PERFORMANCE_METRIC, {
			metric_name: metric,
			metric_value: value,
			metric_unit: unit,
		});
	}

	/**
	 * Log network error events
	 */
	static logNetworkError(error: any, endpoint?: string) {
		this.logEvent(ANALYTICS_EVENTS.NETWORK_ERROR, {
			error_message: error.message,
			endpoint,
			error_code: error.code,
		});
	}
}

// Hook for tracking screen views automatically
export const useAnalytics = (screenName: string) => {
	React.useEffect(() => {
		Analytics.logScreenView(screenName);
	}, [screenName]);
};
