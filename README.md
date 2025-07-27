# 📱 Zeitgeist - Real-time Chat App

A modern, production-ready React Native chat application built with Expo, Firebase, and TypeScript.

## ✨ Features

### 🔐 Authentication

- **Phone Number Authentication** with SMS verification
- Secure Firebase Authentication integration
- Auto-verification with 6-digit SMS codes
- User registration with username and phone number

### 💬 Real-time Chat

- Global chat room for all users
- Real-time message synchronization with Firestore
- Message actions (copy, report)
- Loading states and empty state handling
- Message timestamps and user identification
- Character limit (500 characters)

### 👤 User Management

- User profiles with avatar generation
- Username updates
- Phone number display (masked for privacy)
- Secure logout functionality

### 🛡️ Security & Moderation

- Production-ready Firestore security rules
- Message reporting system
- Input validation and sanitization
- Error handling and user feedback
- Analytics and error tracking

### 📱 Production Ready

- Professional app configuration
- Error handling utilities
- Analytics integration
- Performance optimizations
- App Store/Play Store ready configuration

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Expo CLI installed (`npm install -g @expo/cli`)
- Firebase project set up
- iOS Simulator or Android Emulator (or physical device with Expo Go)

### Installation

1. **Clone and Install**

   ```bash
   cd ZeitgeistApp
   npm install
   ```

2. **Firebase Setup**

   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable **Authentication** → **Phone** provider
   - Create **Firestore Database**
   - Update `src/config/firebase.ts` with your config (already configured)

3. **Set Firestore Security Rules**

   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Messages: authenticated users can read/write
       match /messages/{messageId} {
         allow read, write: if request.auth != null;
       }

       // Users: can only edit own profile
       match /users/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && request.auth.uid == userId;
       }

       // Reports: authenticated users can create
       match /reports/{reportId} {
         allow create: if request.auth != null;
         allow read, update, delete: if false;
       }
     }
   }
   ```

4. **Run the App**
   ```bash
   npm start
   ```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   └── MessageActions.tsx
├── contexts/           # React Context providers
│   └── AuthContext.tsx
├── screens/            # App screens
│   ├── AuthScreen.tsx
│   ├── ChatScreen.tsx
│   ├── PhoneVerificationScreen.tsx
│   └── ProfileScreen.tsx
├── config/             # Configuration files
│   └── firebase.ts
└── utils/              # Utility functions
    ├── constants.ts
    ├── analytics.ts
    └── errorHandler.ts
```

## 🔧 Key Technologies

- **Frontend**: React Native + Expo
- **Backend**: Firebase (Auth + Firestore)
- **Language**: TypeScript
- **Navigation**: React Navigation 7
- **UI**: React Native built-in components
- **State Management**: React Context

## 📱 Screens Overview

### 1. Authentication Flow

- **AuthScreen**: Phone number and username input
- **PhoneVerificationScreen**: SMS code verification with auto-retry

### 2. Main App

- **ChatScreen**: Real-time chat with message actions
- **ProfileScreen**: User profile management and settings

## 🎯 Production Features

### Error Handling

- Comprehensive error catching and user-friendly messages
- Firebase error mapping
- Network error detection
- Retry mechanisms for failed operations

### Analytics

- User action tracking
- Screen view analytics
- Performance monitoring
- Error logging

### Validation

- Phone number formatting and validation
- Username validation (2-30 characters, alphanumeric)
- Message length limits
- Form validation with real-time feedback

### Security

- Firestore security rules preventing unauthorized access
- Input sanitization
- Rate limiting protection
- User data privacy (masked phone numbers)

## 🛠️ Development Notes

### Authentication Flow

```typescript
1. User enters phone number + username
2. SMS verification code sent
3. User enters 6-digit code
4. Account created and user logged in
5. Automatic navigation to chat
```

### Message Flow

```typescript
1. User types message
2. Validated (length, content)
3. Sent to Firestore with timestamp
4. Real-time sync to all connected users
5. Auto-scroll to newest messages
```

### Key Constants

- **Message limit**: 500 characters
- **Username**: 2-30 characters, alphanumeric
- **Verification code**: 6 digits, 5-minute expiry
- **Phone number**: US format (+1)

## 🚢 Deployment

### App Store Preparation

1. **Update app.json** with your bundle IDs
2. **Create app icons** (1024x1024 for store)
3. **Generate splash screens** for different devices
4. **Configure EAS Build**:
   ```bash
   eas build:configure
   eas build --platform ios --profile production
   eas build --platform android --profile production
   ```

### Required App Store Assets

- App icon (1024x1024)
- Screenshots (5-10 images)
- App description
- Privacy policy URL
- Terms of service URL
- Keywords for discovery

### Environment Variables

For production, set these in EAS:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`

## 🔄 Future Enhancements

### Immediate Roadmap

- [ ] Push notifications for new messages
- [ ] Message reactions (👍❤️😂)
- [ ] User online status indicators
- [ ] Image/media message support
- [ ] Message search functionality

### Advanced Features

- [ ] Private messaging
- [ ] Multiple chat rooms
- [ ] Message threading
- [ ] Voice messages
- [ ] Video calls
- [ ] Admin moderation panel

## 🐛 Troubleshooting

### Common Issues

**"Missing or insufficient permissions" error:**

- Check Firestore security rules are properly set
- Ensure user is authenticated
- Verify project configuration

**Phone verification not working:**

- Ensure Firebase Phone Auth is enabled
- Check quota limits in Firebase Console
- Verify phone number format (+1XXXXXXXXXX)

**Real-time updates not working:**

- Check internet connection
- Verify Firestore rules allow read access
- Check browser console for errors

### Support

- Create issues in the repository
- Check Firebase Console for service status
- Review Firestore security rules

## 📄 License

This project is built for educational purposes. Modify and use as needed for your own projects.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

**Built with ❤️ using React Native, Expo, and Firebase**
