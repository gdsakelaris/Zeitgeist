// Copy and paste these rules into your Firebase Console
// Go to: Firebase Console → Firestore Database → Rules tab

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - users can read their own data and search other users
    match /users/{userId} {
      // Users can read and write their own profile
      allow read, write: if request.auth != null && request.auth.uid == userId;
      // All authenticated users can read other users for search functionality
      allow read: if request.auth != null;
    }
    
    // User pages collection - each user has their own page
    match /userPages/{userId} {
      // Anyone can read user pages (for visiting other users' pages)
      allow read: if request.auth != null;
      // Only the page owner can create/update their page metadata
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // Messages subcollection within each user's page
      match /messages/{messageId} {
        // Anyone can read messages (for visiting other users' pages)
        allow read: if request.auth != null;
        
        // Only the page owner can create messages on their own page
        allow create: if request.auth != null && 
                     request.auth.uid == userId && 
                     request.auth.uid == resource.data.userId;
        
        // Only the message author can update/delete their own messages
        allow update, delete: if request.auth != null && 
                             request.auth.uid == resource.data.userId;
      }
    }
    
    // Reports collection for content moderation
    match /reports/{reportId} {
      // Any authenticated user can create reports
      allow create: if request.auth != null;
      // Users can read their own reports
      allow read: if request.auth != null && request.auth.uid == resource.data.reportedBy;
      // TODO: Add admin rules for managing reports in production
    }
    
    // Legacy messages collection (can be removed after migration)
    match /messages/{messageId} {
      // Temporarily keep read access for any existing data
      allow read: if request.auth != null;
      // Prevent new writes to old collection
      allow write: if false;
    }
  }
} 