# Expo React Native Starter Template

A clean and minimal React Native app template with Expo, pre-configured with essential packages and App Store submission setup.

## Features

- ✅ Clean Expo/React Native setup
- ✅ RevenueCat subscription integration (with placeholder configuration)
- ✅ iOS & Android project configurations
- ✅ App Store and Google Play submission configs (EAS)
- ✅ Essential navigation setup
- ✅ TypeScript support
- ✅ Clean folder structure

## Getting Started

### Prerequisites

- Node.js (18+)
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. Clone or download this template
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

### Configuration

#### 1. App Configuration
Edit `app.config.js` to update:
- App name and slug
- Bundle identifiers
- App icons and splash screens
- Permissions

#### 2. RevenueCat Setup
Edit `src/services/SubscriptionService.js`:
- Replace API keys with your RevenueCat keys
- Update product IDs with your App Store Connect / Google Play Console product IDs

#### 3. EAS Project Setup
- Create an Expo account at [expo.dev](https://expo.dev)
- Run `eas build:configure` to set up your project
- Update the `projectId` in `app.config.js`

## Project Structure

```
src/
  screens/          # App screens
  navigation/       # Navigation setup
  services/         # Business logic and API services
  components/       # Reusable UI components
  hooks/            # Custom React hooks
  utils/            # Utility functions
  context/          # React context providers
  constants/        # App constants
  styles/           # Shared styles
assets/             # Images, fonts, etc.
ios/                # iOS native project files
android/            # Android native project files
```

## Building and Deployment

### Development Build
```bash
eas build --profile development
```

### Production Build
```bash
eas build --profile production
```

### App Store Submission
```bash
eas submit --platform ios
```

### Google Play Submission
```bash
eas submit --platform android
```

## Customization

This template provides a solid foundation. Common next steps:

1. **Design System**: Add your colors, typography, and component library
2. **State Management**: Add Redux, Zustand, or other state management
3. **API Integration**: Add REST/GraphQL clients
4. **Authentication**: Implement user auth (Firebase, Auth0, etc.)
5. **Push Notifications**: Configure Expo notifications
6. **Analytics**: Add analytics tracking
7. **Error Tracking**: Add crash reporting (Sentry, Bugsnag)

## License

MIT License - use this template for any project!