/**
 * Input Sanitization Utilities
 * Provides functions to sanitize and validate user input for security
 */

import { VALIDATION } from "./constants";

export class InputSanitizer {
	/**
	 * Sanitize text input by removing potentially harmful characters
	 */
	static sanitizeText(input: string): string {
		if (!input || typeof input !== "string") {
			return "";
		}

		return (
			input
				.trim()
				// Remove null bytes
				.replace(/\0/g, "")
				// Remove control characters except newlines and tabs
				.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
				// Normalize whitespace
				.replace(/\s+/g, " ")
				// Remove leading/trailing whitespace
				.trim()
		);
	}

	/**
	 * Sanitize username input
	 */
	static sanitizeUsername(username: string): string {
		if (!username || typeof username !== "string") {
			return "";
		}

		return (
			username
				.trim()
				.toLowerCase()
				// Remove any characters not allowed by pattern
				.replace(/[^a-zA-Z0-9_-]/g, "")
				// Limit length
				.substring(0, VALIDATION.USERNAME.MAX_LENGTH)
		);
	}

	/**
	 * Sanitize phone number input
	 */
	static sanitizePhoneNumber(phone: string): string {
		if (!phone || typeof phone !== "string") {
			return "";
		}

		return (
			phone
				.trim()
				// Remove all non-digit characters except +
				.replace(/[^\d+]/g, "")
				// Ensure it starts with + if international
				.replace(/^(?!\+)/, "+1")
		);
	}

	/**
	 * Sanitize message text
	 */
	static sanitizeMessage(message: string): string {
		if (!message || typeof message !== "string") {
			return "";
		}

		return (
			message
				.trim()
				// Remove null bytes and control characters except newlines
				.replace(/\0/g, "")
				.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
				// Limit excessive newlines
				.replace(/\n{3,}/g, "\n\n")
				// Trim and limit length
				.substring(0, VALIDATION.MESSAGE?.MAX_LENGTH || 500)
				.trim()
		);
	}

	/**
	 * Validate username format
	 */
	static validateUsername(username: string): {
		isValid: boolean;
		error?: string;
	} {
		const sanitized = this.sanitizeUsername(username);

		if (!sanitized) {
			return { isValid: false, error: "Username is required" };
		}

		if (sanitized.length < VALIDATION.USERNAME.MIN_LENGTH) {
			return {
				isValid: false,
				error: `Username must be at least ${VALIDATION.USERNAME.MIN_LENGTH} characters`,
			};
		}

		if (sanitized.length > VALIDATION.USERNAME.MAX_LENGTH) {
			return {
				isValid: false,
				error: `Username must be no more than ${VALIDATION.USERNAME.MAX_LENGTH} characters`,
			};
		}

		if (!VALIDATION.USERNAME.PATTERN.test(sanitized)) {
			return {
				isValid: false,
				error:
					"Username can only contain letters, numbers, hyphens, and underscores",
			};
		}

		// Check for reserved words
		const reservedWords = [
			"admin",
			"administrator",
			"moderator",
			"mod",
			"root",
			"system",
			"support",
			"help",
			"api",
			"www",
			"mail",
			"email",
			"zeitgeist",
		];

		if (reservedWords.includes(sanitized)) {
			return { isValid: false, error: "This username is not available" };
		}

		return { isValid: true };
	}

	/**
	 * Validate phone number format
	 */
	static validatePhoneNumber(phone: string): {
		isValid: boolean;
		error?: string;
	} {
		const sanitized = this.sanitizePhoneNumber(phone);

		if (!sanitized) {
			return { isValid: false, error: "Phone number is required" };
		}

		// Basic US phone number validation
		const phoneRegex = /^\+1\d{10}$/;
		if (!phoneRegex.test(sanitized)) {
			return {
				isValid: false,
				error: "Please enter a valid US phone number",
			};
		}

		return { isValid: true };
	}

	/**
	 * Validate message content
	 */
	static validateMessage(message: string): {
		isValid: boolean;
		error?: string;
	} {
		const sanitized = this.sanitizeMessage(message);

		if (!sanitized) {
			return { isValid: false, error: "Message cannot be empty" };
		}

		const maxLength = VALIDATION.MESSAGE?.MAX_LENGTH || 500;
		if (sanitized.length > maxLength) {
			return {
				isValid: false,
				error: `Message must be no more than ${maxLength} characters`,
			};
		}

		// Check for spam patterns
		const spamPatterns = [
			/(.)\1{10,}/, // Repeated characters
			/http[s]?:\/\/[^\s]+/gi, // URLs (basic detection)
			/\b(buy|sale|cheap|discount|offer|deal)\b.{0,20}\b(now|today|click|visit)\b/gi,
		];

		for (const pattern of spamPatterns) {
			if (pattern.test(sanitized)) {
				return {
					isValid: false,
					error: "Message contains content that appears to be spam",
				};
			}
		}

		return { isValid: true };
	}

	/**
	 * Escape HTML entities to prevent XSS
	 */
	static escapeHtml(text: string): string {
		if (!text || typeof text !== "string") {
			return "";
		}

		const htmlEntities: Record<string, string> = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#x27;",
			"/": "&#x2F;",
		};

		return text.replace(/[&<>"'/]/g, (char) => htmlEntities[char] || char);
	}

	/**
	 * Remove potentially dangerous content from text
	 */
	static removeDangerousContent(text: string): string {
		if (!text || typeof text !== "string") {
			return "";
		}

		return (
			text
				// Remove script tags
				.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
				// Remove on* event handlers
				.replace(/\s*on\w+\s*=\s*"[^"]*"/gi, "")
				.replace(/\s*on\w+\s*=\s*'[^']*'/gi, "")
				// Remove javascript: URLs
				.replace(/javascript:/gi, "")
				// Remove data: URLs
				.replace(/data:/gi, "")
		);
	}

	/**
	 * Comprehensive input sanitization for all user inputs
	 */
	static sanitizeUserInput(
		input: any,
		type: "username" | "phone" | "message" | "text" = "text"
	): string {
		if (input === null || input === undefined) {
			return "";
		}

		// Convert to string if not already
		const stringInput = String(input);

		switch (type) {
			case "username":
				return this.sanitizeUsername(stringInput);
			case "phone":
				return this.sanitizePhoneNumber(stringInput);
			case "message":
				return this.sanitizeMessage(stringInput);
			case "text":
			default:
				return this.sanitizeText(stringInput);
		}
	}
}

/**
 * Rate limiting utilities for input validation
 */
export class RateLimit {
	private static attempts: Map<string, { count: number; lastAttempt: number }> =
		new Map();

	/**
	 * Check if rate limit is exceeded for a given key
	 */
	static checkLimit(
		key: string,
		maxAttempts: number = 5,
		windowMs: number = 60000
	): boolean {
		const now = Date.now();
		const record = this.attempts.get(key);

		if (!record || now - record.lastAttempt > windowMs) {
			this.attempts.set(key, { count: 1, lastAttempt: now });
			return false; // Not limited
		}

		if (record.count >= maxAttempts) {
			return true; // Rate limited
		}

		record.count++;
		record.lastAttempt = now;
		return false; // Not limited
	}

	/**
	 * Reset rate limit for a key
	 */
	static resetLimit(key: string): void {
		this.attempts.delete(key);
	}

	/**
	 * Clean up old entries
	 */
	static cleanup(maxAge: number = 300000): void {
		const now = Date.now();
		for (const [key, record] of this.attempts.entries()) {
			if (now - record.lastAttempt > maxAge) {
				this.attempts.delete(key);
			}
		}
	}
}
