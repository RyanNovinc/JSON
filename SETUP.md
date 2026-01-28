# Setup Instructions

## 1. Initial Configuration

### Update App Identity
Edit `app.config.js`:
```javascript
name: "Your App Name",           // App display name
slug: "your-app-slug",           // URL-friendly identifier
bundleIdentifier: "com.yourcompany.yourapp",  // iOS bundle ID
package: "com.yourcompany.yourapp",            // Android package name
```

### Update Project Configuration
Edit `package.json`:
```json
{
  "name": "your-app-name",
  "author": "Your Name",
  // ... other fields
}
```

## 2. RevenueCat Setup

1. Create account at [RevenueCat](https://app.revenuecat.com)
2. Create your app project
3. Get your API keys from Settings > API Keys
4. Update `src/services/SubscriptionService.js`:
   - Replace `REVENUECAT_API_KEY_IOS`
   - Replace `REVENUECAT_API_KEY_ANDROID`
   - Update product IDs in `SUBSCRIPTION_PRODUCTS`

## 3. App Store Connect Setup

1. Create app in App Store Connect
2. Configure In-App Purchases
3. Update product IDs to match RevenueCat

## 4. EAS (Expo Application Services) Setup

1. Install EAS CLI: `npm install -g eas-cli`
2. Login: `eas login`
3. Configure project: `eas build:configure`
4. Update `app.config.js` with your project ID

## 5. iOS-Specific Setup

### Clean iOS Project Names
The iOS project currently uses "LifeCompass" naming. To rename:

1. Open `ios/LifeCompass.xcworkspace` in Xcode
2. Rename the project to your app name
3. Update bundle identifier
4. Update scheme names

### StoreKit Configuration
1. Replace `ios/Products.storekit` with your product configuration
2. Or remove the reference in `app.config.js` if not using local StoreKit testing

## 6. Android Setup

1. Open `android/` in Android Studio
2. Update package name in:
   - `android/app/src/main/AndroidManifest.xml`
   - `android/app/build.gradle`
   - Java/Kotlin package structure

## 7. Add App Assets

### Required Assets:
- `assets/images/icon.png` (1024x1024)
- `assets/images/adaptive-icon.png` (1024x1024, Android)
- App Store screenshots
- Marketing assets

### Generate Icons:
- Use [App Icon Generator](https://appicon.co/)
- Or [Expo Icon Tools](https://icon.kitchen/)

## 8. Environment Variables

Create `.env` file:
```
REVENUECAT_API_KEY_IOS=your_ios_key
REVENUECAT_API_KEY_ANDROID=your_android_key
```

## 9. Test Your Setup

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build development version
eas build --profile development

# Test on device/simulator
```

## 10. Deploy

### Development Build
```bash
eas build --profile development
```

### Production Build
```bash
eas build --profile production
```

### Submit to Stores
```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

## Common Issues

### Build Errors
- Make sure all bundle identifiers match
- Verify signing certificates are configured
- Check that all required assets are present

### RevenueCat Issues
- Verify API keys are correct
- Check product IDs match store configuration
- Ensure test accounts are configured

### iOS Simulator Issues
- Clean build folder: `cd ios && rm -rf build/`
- Clean Pods: `cd ios && pod deintegrate && pod install`

## Next Steps

1. Set up analytics (Firebase, Amplitude, etc.)
2. Configure push notifications
3. Add crash reporting (Sentry, Bugsnag)
4. Implement your app's specific features
5. Set up CI/CD pipeline

## Support

- [Expo Documentation](https://docs.expo.dev/)
- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [React Navigation](https://reactnavigation.org/docs/getting-started)