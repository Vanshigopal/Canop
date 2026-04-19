# Canop Mobile (Android)

React Native app for Android. Material Design 3 throughout.

The app talks to the same `apps/api` backend as the web client — no
separate API. Authentication, real-time updates (Socket.io), and push
notifications (Firebase Cloud Messaging) all use endpoints already
shipped in earlier sessions, plus the new `/api/v1/auth/device-token`
endpoint added in session 15.

---

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+
- **Java** 17 (Android Studio's bundled JDK is fine)
- **Android Studio** (Hedgehog or newer) with:
  - Android SDK 34 (compile target)
  - Android SDK build-tools 34.0.0
  - Android NDK 26.1.10909125
  - At least one Android Virtual Device (or a USB-debug-enabled physical phone)
- For Firebase push notifications: a Firebase project with `google-services.json`
  dropped into `android/app/` (see _Firebase setup_ below).

---

## First-time setup

```bash
# 1. Install JS dependencies for the workspace
pnpm install

# 2. Configure your API URL
$EDITOR apps/mobile/src/config/constants.ts
# Set API_URL to where your backend runs.
# - Android emulator -> http://10.0.2.2:3001/api/v1
# - Physical device  -> http://<your-LAN-IP>:3001/api/v1
# - Production       -> https://api.your-tenant.canop.app/api/v1
```

## Running in development

```bash
# In one terminal — start the Metro bundler
cd apps/mobile
pnpm start

# In another terminal — install + launch on a connected device or emulator
pnpm android
```

Hot reload works out of the box. Code changes in `src/` are reflected
without a full rebuild.

## Building a release APK

```bash
cd apps/mobile/android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

For Play Store distribution, build an Android App Bundle instead:

```bash
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

> The default keystore wired into `android/app/build.gradle` is the
> standard React Native debug keystore. Replace it with a real signing
> config before any production release. See:
> https://reactnative.dev/docs/signed-apk-android

## Firebase setup (for push notifications)

1. Create a Firebase project at https://console.firebase.google.com
2. Add an Android app with the package name `app.canop.mobile`
3. Download `google-services.json` and drop it into `apps/mobile/android/app/`
4. The Gradle plugin auto-applies whenever that file is present
5. Push notifications are wired through `src/services/notifications.ts`
   and registered with the backend via `Auth.registerDeviceToken()` in
   `src/api/endpoints.ts`

If you skip Firebase setup, the app still works — push notifications
are simply silent, and the FCM registration call is a no-op.

## Project layout

```
apps/mobile/
\u251C\u2500\u2500 src/
\u2502   \u251C\u2500\u2500 App.tsx                  # root component, wires QueryClient + AuthProvider
\u2502   \u251C\u2500\u2500 api/                     # axios client + typed endpoints
\u2502   \u251C\u2500\u2500 auth/                    # AuthContext, encrypted storage, biometric stub
\u2502   \u251C\u2500\u2500 components/              # MD3 primitives + domain components
\u2502   \u251C\u2500\u2500 config/                  # constants + theme tokens
\u2502   \u251C\u2500\u2500 hooks/                   # useApi, useSocket, useNotifications, useOfflineQueue
\u2502   \u251C\u2500\u2500 navigation/              # RootNavigator + 4 role-based bottom-tab navigators
\u2502   \u251C\u2500\u2500 screens/                 # auth + admin/teacher/student/parent + shared
\u2502   \u251C\u2500\u2500 services/                # FCM bootstrap + Socket.io singleton
\u2502   \u2514\u2500\u2500 utils/                   # indianNumbers, dateFormat, severity
\u2514\u2500\u2500 android/                     # native Android project
```

## Architecture notes

- All tokens live in **react-native-encrypted-storage** (Android Keystore).
  Never `AsyncStorage` — it's plain SharedPreferences.
- Real-time updates: `useSocket()` in any screen, registers handlers
  for events like `attendance:marked`, `payment:received`,
  `marks:published`. The hook tears the socket down on unmount.
- Offline mutations: `useOfflineQueue()` is a tiny FIFO queue persisted
  to encrypted storage. Wire NetInfo in your screen to call `flush()`
  when the connection comes back.
- The `authenticate` middleware on the backend already enforces
  per-tenant scoping — the mobile app sends `X-Tenant-Slug` on every
  request via the axios interceptor.
