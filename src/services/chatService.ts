import {
	collection,
	addDoc,
	onSnapshot,
	query,
	orderBy,
	limit,
	serverTimestamp,
	Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

export interface Message {
	id: string;
	text: string;
	username: string;
	userId: string;
	timestamp: Date;
	createdAt: Timestamp;
}

export interface MessageInput {
	text: string;
	username: string;
	userId: string;
}

const MESSAGES_COLLECTION = "messages";
const MESSAGES_LIMIT = 100;

export class ChatService {
	// Send a new message
	static async sendMessage(messageData: MessageInput): Promise<void> {
		try {
			await addDoc(collection(db, MESSAGES_COLLECTION), {
				...messageData,
				createdAt: serverTimestamp(),
				timestamp: new Date(),
			});
		} catch (error) {
			console.error("Error sending message:", error);
			throw error;
		}
	}

	// Subscribe to messages in real-time
	static subscribeToMessages(
		callback: (messages: Message[]) => void,
		onError?: (error: Error) => void
	): () => void {
		const q = query(
			collection(db, MESSAGES_COLLECTION),
			orderBy("createdAt", "asc"),
			limit(MESSAGES_LIMIT)
		);

		return onSnapshot(
			q,
			(snapshot) => {
				const messages: Message[] = [];
				snapshot.forEach((doc) => {
					const data = doc.data();
					messages.push({
						id: doc.id,
						text: data.text,
						username: data.username,
						userId: data.userId,
						timestamp: data.timestamp?.toDate() || new Date(),
						createdAt: data.createdAt,
					});
				});
				callback(messages);
			},
			(error) => {
				console.error("Error fetching messages:", error);
				if (onError) {
					onError(error);
				}
			}
		);
	}
}
