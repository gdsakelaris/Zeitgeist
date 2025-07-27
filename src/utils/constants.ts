// App Constants
export const APP_CONFIG = {
	VERSION: "1.0.0",
	NAME: "Zeitgeist",
	COMPANY: "Zeitgeist Inc.",
	SUPPORT_EMAIL: "support@zeitgeist.app",
	PRIVACY_POLICY_URL: "https://zeitgeist.app/privacy",
	TERMS_OF_SERVICE_URL: "https://zeitgeist.app/terms",
};

// Message Configuration
export const MESSAGE_CONFIG = {
	MAX_LENGTH: 500,
	MIN_LENGTH: 1,
	BATCH_SIZE: 50,
	REFRESH_INTERVAL: 30000, // 30 seconds
};

// Validation Rules
export const VALIDATION = {
	USERNAME: {
		MIN_LENGTH: 2,
		MAX_LENGTH: 30,
		PATTERN: /^[a-zA-Z0-9_-]+$/,
	},
	PHONE: {
		MIN_LENGTH: 10,
		MAX_LENGTH: 15,
	},
	MESSAGE: {
		MIN_LENGTH: 1,
		MAX_LENGTH: 500,
	},
	VERIFICATION_CODE: {
		LENGTH: 6,
		EXPIRY_TIME: 300, // 5 minutes
	},
};

// UI Constants
export const UI = {
	HEADER_HEIGHT: 60,
	TAB_BAR_HEIGHT: 80,
	ANIMATION_DURATION: 300,
	DEBOUNCE_DELAY: 500,
};

// Error Messages
export const ERROR_MESSAGES = {
	NETWORK: "Network error. Please check your connection.",
	GENERIC: "Something went wrong. Please try again.",
	PERMISSION_DENIED: "Permission denied. Please check your account settings.",
	RATE_LIMITED: "Too many requests. Please wait before trying again.",
	INVALID_INPUT: "Please check your input and try again.",
};
