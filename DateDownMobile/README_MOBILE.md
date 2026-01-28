# Date-Down Mobile App

A React Native/Expo version of the Date-Down countdown app, compatible with iOS and Android.

## Features

- User authentication (login/register)
- Create and manage countdowns
- Favorite countdowns
- Custom color themes
- Premium features toggle
- Responsive UI optimized for mobile

## Setup Instructions

### 1. Configure Environment

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update `EXPO_PUBLIC_API_URL` in `.env` to point to your backend server:
   - For local development: `http://localhost:3000` (or your machine's IP address for physical device testing)
   - For production: Your deployed backend URL

### 2. Start the Backend Server

Navigate to the original Date-Down web app directory and start the server:
```bash
cd ~/Downloads/Date-Down
npm install
npm run dev
```

### 3. Run the Mobile App

#### For iOS Simulator:
```bash
npm run ios
```

#### For Android Emulator:
```bash
npm run android
```

#### For Physical Device:
```bash
npx expo start
```
Then scan the QR code with:
- iOS: Camera app
- Android: Expo Go app

## Project Structure

```
DateDownMobile/
├── src/
│   ├── screens/         # App screens
│   ├── navigation/      # Navigation configuration
│   ├── components/      # Reusable components
│   ├── services/        # API services
│   ├── hooks/           # Custom hooks
│   ├── types/          # TypeScript types
│   └── utils/          # Utility functions
├── App.tsx             # Main app component
└── package.json        # Dependencies
```

## Key Technologies

- **React Native**: Cross-platform mobile framework
- **Expo**: Development platform and tools
- **React Navigation**: Navigation library
- **React Query**: Data fetching and caching
- **React Hook Form**: Form management
- **Zod**: Schema validation
- **Date-fns**: Date utilities

## Backend API Connection

The app connects to the Express backend from the original Date-Down web app. Make sure:

1. Backend server is running
2. API URL is correctly configured in `.env`
3. For physical device testing, use your machine's IP address instead of `localhost`

## Differences from Web App

### UI Components
- Radix UI → React Native Elements/Custom components
- Tailwind CSS → StyleSheet API
- Wouter → React Navigation

### Features
- Touch-optimized interactions
- Native date pickers
- Platform-specific styling
- Mobile-optimized layouts

## Troubleshooting

### Cannot connect to backend:
- Ensure backend is running
- Check API URL in `.env`
- For physical devices, use machine IP not localhost

### Build issues:
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx expo start --clear
```

### iOS Simulator not starting:
- Ensure Xcode is installed
- Open Xcode once to accept licenses
- Check that iOS simulator is installed

## Next Steps

To deploy to App Store/Play Store:
1. Create Expo account: `expo register`
2. Build for production: `expo build:ios` or `expo build:android`
3. Follow platform-specific submission guidelines