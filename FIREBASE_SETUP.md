# Firebase Authentication Setup for Subway Math

## ✅ What's Been Done

Firebase authentication has been enabled for Subway Math with the following configuration:
- **Project ID**: `subwaymath-77158`
- **Auth Domain**: `subwaymath-77158.firebaseapp.com`
- **Authentication Method**: Anonymous Sign-In
- **Database**: Firestore

## 🔧 Required Setup Steps

### 1. Add Your Firebase API Key

Open `index.html` and find line ~846. Replace `YOUR_API_KEY_HERE` with your actual Firebase API key:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY", // ← Replace this
    authDomain: "subwaymath-77158.firebaseapp.com",
    projectId: "subwaymath-77158"
};
```

**How to get your API key:**
1. Go to [Firebase Console](https://console.firebase.google.com/project/subwaymath-77158/settings/general)
2. Scroll to "Your apps" section
3. Click on your web app (</> icon) or create one
4. Copy the `apiKey` value from the config

### 2. Enable Anonymous Authentication

1. Go to [Firebase Authentication](https://console.firebase.google.com/project/subwaymath-77158/authentication/providers)
2. Click "Get started" if this is your first time
3. Click on "Anonymous" in the sign-in providers list
4. Toggle the "Enable" switch
5. Click "Save"

### 3. Set Up Firestore Database

1. Go to [Firestore Database](https://console.firebase.google.com/project/subwaymath-77158/firestore)
2. Click "Create database"
3. Choose "Start in production mode" or "test mode" (for development)
4. Select your preferred location
5. Click "Enable"

**Recommended Firestore Rules for Development:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 🔒 Security Notes

### Service Account Key
Your Firebase service account key has been saved to `firebase-service-account.json` and is protected by `.gitignore`.

**NEVER commit this file to version control!** It contains administrative credentials.

### API Key in Client Code
The Firebase web API key in `index.html` is **safe to expose publicly**. It's meant for client-side use and is restricted by:
- Firebase Authentication rules
- Firestore security rules
- Firebase project settings

However, make sure your Firestore rules are properly configured to prevent unauthorized access.

## 📊 How It Works

When users visit Subway Math:
1. They're automatically signed in anonymously via Firebase Auth
2. A unique user ID is generated for each device/browser
3. Their progress is saved to Firestore at:
   ```
   artifacts/subway-math-app/users/{userId}/mathShortcutsProgress/data
   ```
4. Progress syncs in real-time across tabs
5. Data persists across sessions

## 🧪 Testing

After completing the setup:
1. Open `index.html` in a browser
2. Open browser DevTools (F12) → Console
3. Look for authentication messages
4. Check that user progress saves correctly
5. Verify data appears in Firestore console

## 🚨 Common Issues

### "Authentication failed" error
- Ensure Anonymous sign-in is enabled in Firebase Console
- Check that your API key is correct
- Verify your Firebase config matches your project

### "Could not save progress" error
- Check Firestore security rules
- Ensure Firestore database is created
- Verify the user is authenticated (check DevTools console)

### Data not syncing
- Check browser console for errors
- Verify Firestore rules allow read/write for authenticated users
- Ensure you're using the same browser/device for testing

## 📝 Next Steps

After adding your API key:
1. Test the authentication flow
2. Customize Firestore security rules for production
3. Consider adding other sign-in methods (Google, Email, etc.)
4. Set up Firebase Hosting for deployment

## 🔗 Useful Links

- [Firebase Console](https://console.firebase.google.com/project/subwaymath-77158)
- [Authentication Settings](https://console.firebase.google.com/project/subwaymath-77158/authentication)
- [Firestore Database](https://console.firebase.google.com/project/subwaymath-77158/firestore)
- [Project Settings](https://console.firebase.google.com/project/subwaymath-77158/settings/general)
