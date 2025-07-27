# Firebase Schema for User Pages System

## Overview

The app now uses a user-centric message board system where each user has their own page with personal messages. This replaces the previous global chat system.

## Collections Structure

### 1. Users Collection: `users/{userId}`

```typescript
{
  username: string,           // Unique username (lowercase)
  phoneNumber: string,        // Verified phone number
  email: string,             // Generated email for Firebase Auth
  createdAt: Timestamp,      // Account creation date
  phoneVerified: boolean,    // Phone verification status
  userId: string            // Firebase Auth UID
}
```

### 2. User Pages Collection: `userPages/{userId}`

```typescript
{
  // Document contains metadata about the user's page
  username: string,          // Display username
  createdAt: Timestamp,     // Page creation date
  messageCount: number,     // Total messages posted (optional)
  lastActive: Timestamp     // Last message posted (optional)
}
```

### 3. User Messages Subcollection: `userPages/{userId}/messages/{messageId}`

```typescript
{
  text: string,             // Message content
  username: string,         // Author's username
  userId: string,          // Author's user ID (should match parent userId)
  timestamp: Timestamp,    // Message creation time
  createdAt: Timestamp     // Server timestamp for ordering
}
```

### 4. Reports Collection: `reports/{reportId}` (unchanged)

```typescript
{
  messageId: string,        // Reported message ID
  messageText: string,      // Content of reported message
  reportedBy: string,       // Reporter's user ID
  reportedByUsername: string, // Reporter's username
  reason: string,           // Report reason
  timestamp: Timestamp,     // Report time
  status: "pending" | "resolved" | "dismissed"
}
```

## Security Rules

### Firestore Rules Example:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null; // Allow reading other users for search
    }

    // User pages are readable by anyone, writable only by owner
    match /userPages/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;

      // Messages within a user's page
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null &&
                     request.auth.uid == userId &&
                     request.auth.uid == resource.data.userId;
        allow update, delete: if request.auth != null &&
                             request.auth.uid == resource.data.userId;
      }
    }

    // Reports collection
    match /reports/{reportId} {
      allow create: if request.auth != null;
      allow read, update: if request.auth != null; // Admins only in production
    }
  }
}
```

## Transition from Global Chat

### Fresh Start Approach:

Since we're fundamentally changing the app structure from a global chat to individual user pages, we'll start with a clean slate:

1. **Delete old messages collection** (optional - can leave for historical reference)
2. **Users start fresh** with empty personal pages
3. **New posting experience** begins immediately

### Clean Slate Setup:

#### Option 1: Delete Old Messages (Recommended)

```javascript
// Run this in Firebase Console
async function clearOldMessages() {
	const batch = admin.firestore().batch();
	const messagesSnapshot = await admin.firestore().collection("messages").get();

	messagesSnapshot.docs.forEach((doc) => {
		batch.delete(doc.ref);
	});

	await batch.commit();
	console.log("Old messages cleared successfully");
}
```

#### Option 2: Archive Old Messages

```javascript
// Simply rename the collection in Firebase Console
// 'messages' → 'archived_messages'
// This preserves data for historical reference without affecting the new system
```

### Benefits of Fresh Start:

- **Clean slate** for the new user experience
- **No data inconsistencies** from the old global chat model
- **Simplified deployment** - no complex migration logic
- **Users understand the new paradigm** immediately
- **Better performance** without old data baggage

## Query Examples

### Get User's Messages:

```typescript
const messagesQuery = query(
	collection(db, "userPages", userId, "messages"),
	orderBy("timestamp", "desc"),
	limit(50)
);
```

### Search Users:

```typescript
const usersQuery = query(
	collection(db, "users"),
	where("username", ">=", searchTerm),
	where("username", "<=", searchTerm + "\uf8ff"),
	orderBy("username"),
	limit(20)
);
```

### Get User Page Info:

```typescript
const userPageDoc = await getDoc(doc(db, "userPages", userId));
```

## Benefits of New Schema

1. **Scalability**: Each user's messages are isolated, preventing global collection size issues
2. **Privacy**: Users have complete control over their own message space
3. **Performance**: Queries are faster as they're scoped to individual users
4. **Social Features**: Enables user discovery and following patterns
5. **Moderation**: Each user moderates their own space
6. **Future Features**: Enables user-specific features like themes, settings, etc.

## Storage Considerations

- **Document Limits**: Each user subcollection can hold up to 1M messages (Firestore limit)
- **Query Performance**: Pagination recommended for users with many messages
- **Indexing**: Composite indexes may be needed for complex queries
- **Cleanup**: Consider archiving old messages or implementing retention policies
