// FIXED Firebase Security Rules - Copy these to Firebase Console
// Go to: Firebase Console → Firestore Database → Rules tab

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - simplified rules
    match /users/{userId} {
      // Users can read and write their own profile AND search other users
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // User pages collection
    match /userPages/{userId} {
      // Anyone can read user pages
      allow read: if request.auth != null;
      // Only the page owner can write to their page
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // Messages subcollection
      match /messages/{messageId} {
        // Anyone can read messages
        allow read: if request.auth != null;
        // Only the page owner can create messages on their page
        allow create: if request.auth != null && request.auth.uid == userId;
        // Only the message author can update/delete their messages
        allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
      }
    }
    
    // Reports collection
    match /reports/{reportId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && request.auth.uid == resource.data.reportedBy;
    }
  }
} 