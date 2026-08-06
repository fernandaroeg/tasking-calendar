# Android Mobile Deployment Guide

This document describes how to configure, build, and distribute the Android version of `calendario_ibermex` privately using Capacitor.

## Requirements & Environment Setup

* **Node.js**: `v22.17.0` (or compatible version >= `v18.0.0`)
* **Java Development Kit (JDK)**: JDK 17 (recommended for Capacitor 6 / Android Gradle Plugin 8)
* **Android Studio**: Installed on your developer machine (includes Android SDK, platform tools, and build tooling)

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Compile Web Frontend
Build the Vite React app production bundle:
```bash
npm run build
```

### 3. Sync Web Assets with Capacitor
Copy built assets from `dist/` and sync plugins to the native Android project:
```bash
npx cap sync android
```

### 4. Open in Android Studio
Launch Android Studio with the native `android/` directory:
```bash
npx cap open android
```

---

## Firebase & Google Sign-In Setup (CRITICAL)

Since the app is running in a native Android WebView, you **must** configure native Google Sign-In for Google Authentication to function correctly.

### Part A: Generate and Register SHA-1 Fingerprint in Firebase

For Google Sign-In to be authorized on Android, your app's certificate SHA-1 fingerprint must be registered in the Firebase console.

1. **Locate your debug signing certificate:**
   * On Windows, run the following command in your terminal:
     ```bash
     keytool -list -v -alias androiddebugkey -keystore %USERPROFILE%\.android\debug.keystore -storepass android
     ```
   * *If the keystore file does not exist, build the debug project in Android Studio first, which will auto-generate it.*
2. **Find the SHA-1 fingerprint:**
   * The command above will print details about your certificate. Look for the line starting with `SHA1:`:
     ```text
     SHA1: AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:00:AA:BB:CC:DD
     ```
3. **Register SHA-1 in the Firebase Console:**
   * Go to the [Firebase Console](https://console.firebase.google.com/).
   * Select your project (`calendario-ibermex`).
   * Click on the **Project Settings** (gear icon) in the sidebar.
   * Under the **General** tab, scroll down to the **Your apps** section.
   * Select your Android app (`mx.grupoibermex.calendario`).
   * Click **Add fingerprint**.
   * Paste your SHA-1 key and click **Save**.

### Part B: Generate a Google Web Client ID

Capacitor requires a Google Web Client ID to authenticate the native Google Sign-In tokens on the backend database.

1. **Go to the Google Cloud Console:**
   * Open the [Google Cloud Console](https://console.cloud.google.com/).
   * Select your project associated with your Firebase project (`calendario-ibermex`).
2. **Navigate to Credentials:**
   * Go to **APIs & Services** > **Credentials** in the left navigation sidebar.
3. **Find or Create a Web Client ID:**
   * Look under the **OAuth 2.0 Client IDs** list.
   * If a **Web client (auto-created by Google Service)** already exists, you can copy its **Client ID**.
   * If not, click **+ CREATE CREDENTIALS** at the top and select **OAuth client ID**.
     * **Application type:** Select `Web application`.
     * **Name:** Provide a friendly name (e.g. `Web Client for Android App`).
     * Click **Create**.
4. **Copy the Client ID:**
   * Copy the generated client ID string (it looks like `1234567890-abcdef.apps.googleusercontent.com`).
5. **Update local project configurations:**
   * Open [capacitor.config.ts](file:///c:/Users/fer_r/Documents/Antigravity/calendario_ibermex/calendario_ibermex/capacitor.config.ts) and replace `17140881160-placeholder.apps.googleusercontent.com` in `plugins.GoogleAuth.serverClientId` with your copied Client ID.
   * Open [strings.xml](file:///c:/Users/fer_r/Documents/Antigravity/calendario_ibermex/calendario_ibermex/android/app/src/main/res/values/strings.xml) and replace the value in `server_client_id` string with the same Client ID.
   * Run `npx cap copy` to synchronize strings:
     ```bash
     npx cap copy android
     ```

---

## Building the Android Application

### 1. Compile Debug APK (for Testing)
On Windows:
```powershell
cd android
.\gradlew.bat assembleDebug
```
* The generated test APK will be located at:
  `android/app/build/outputs/apk/debug/app-debug.apk`

### 2. Compile signed Release APK (for Distribution)
To generate a release APK signed for manual distribution, you should create a private release key.

#### Step 2.1: Generate Keystore File
* Run the following command (replace placeholders) and keep the file safe (do **NOT** commit it to Git):
  ```bash
  keytool -genkey -v -keystore release-key.keystore -alias ibermex-key -keyalg RSA -keysize 2048 -validity 10000
  ```

#### Step 2.2: Configure Gradle Signing
* Create a local, untracked `local.properties` file inside the `android/` directory (it is ignored by Git) and add your signing details:
  ```properties
  sdk.dir=C\:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
  
  RELEASE_STORE_FILE=../release-key.keystore
  RELEASE_STORE_PASSWORD=your_keystore_password
  RELEASE_KEY_ALIAS=ibermex-key
  RELEASE_KEY_PASSWORD=your_key_password
  ```
* In `android/app/build.gradle`, update the `android` block to sign releases automatically using these values:
  ```groovy
  signingConfigs {
      release {
          storeFile file(project.property('RELEASE_STORE_FILE'))
          storePassword project.property('RELEASE_STORE_PASSWORD')
          keyAlias project.property('RELEASE_KEY_ALIAS')
          keyPassword project.property('RELEASE_KEY_PASSWORD')
      }
  }
  buildTypes {
      release {
          signingConfig signingConfigs.release
          minifyEnabled false
          proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
      }
  }
  ```

#### Step 2.3: Build Signed Release APK
On Windows:
```powershell
cd android
.\gradlew.bat assembleRelease
```
* The generated release APK will be located at:
  `android/app/build/outputs/apk/release/app-release.apk`

---

## Installation & Updates

1. **Copy the APK to a physical Android device** (via USB, email, or download link).
2. **Enable Unknown Sources:** On the Android device, allow installing apps from files/browser if prompted.
3. **Install the APK:** Tap on the file to install.
4. **Updating without losing data:**
   * Keep the same **App ID** (`mx.grupoibermex.calendario`) and sign the new APK with the **exact same signing keystore file**.
   * Send the new APK to the user. The device will install it as an update, preserving the local session and user data.

---

## Security Considerations

* **Secrets & Keys:** Keystores (`.jks`/`.keystore`) and credentials must **never** be committed to Git. They are ignored by the project's `.gitignore` rules.
* **Network Communication:** The app schema is locked to HTTPS inside `capacitor.config.ts` to block cleartext API requests.
