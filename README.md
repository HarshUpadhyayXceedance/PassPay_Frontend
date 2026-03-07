# PassPay Mobile

React Native mobile app for PassPay — Solana-based event ticketing, merchant payments, loyalty rewards, and live event meetings.

## Stack

- **Expo SDK** 54 · **React Native** 0.81.5 · **React** 19.1 · **TypeScript** 5.9
- **Routing**: expo-router 6 (file-based)
- **State**: Zustand 5
- **Wallet**: Solana Mobile Wallet Adapter (Phantom)
- **Blockchain**: @coral-xyz/anchor 0.32.1 · @solana/web3.js 1.98
- **Live Rooms**: @livekit/react-native 2.9 · livekit-client 2.17
- **Notifications**: Firebase 12.10 · expo-notifications
- **QR**: react-native-qrcode-svg · expo-camera

## Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_DATABASE_URL=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

For EAS builds, add these as EAS secrets via `eas secret:create`.

## Scripts

```bash
npm start          # Expo dev server
npm run android    # Build & run on Android
npm run ios        # Build & run on iOS
```

## App Structure

```
app/
  (auth)/          # Welcome / connect wallet
  (user)/          # Attendee screens (17+ routes)
  (admin)/         # Event admin screens (16+ routes)
  (merchant)/      # Merchant screens (6+ routes)
  (superadmin)/    # Platform super-admin

src/
  screens/         # Screen components
  components/      # Reusable UI
  store/           # Zustand stores
  hooks/           # Data-fetching hooks
  services/        # API, blockchain, notifications
  solana/          # IDL, PDAs, on-chain actions
  types/           # TypeScript types
  theme/           # Colors, fonts, spacing
  utils/           # Formatters, validators
```

## Key Features

| Feature | Description |
|---------|-------------|
| **Tickets** | Buy, transfer, QR display, check-in |
| **Seat Tiers** | Tier-based pricing (Bronze → Platinum) |
| **Loyalty** | Badge collection, streak tracking, tier discounts |
| **Merchant Shop** | Browse & buy products; merchant QR payments |
| **Live Meetings** | Ticket-gated video/audio rooms via LiveKit |
| **Community Rooms** | Public or SKR-gated audio rooms |
| **Dynamic Pricing** | Admin-controlled price multiplier per event |
| **Refunds** | On-chain refund requests and cancellation refunds |

## Role-Based Navigation

| Role | Home | Access |
|------|------|--------|
| `user` | `/(user)` | Events, tickets, shop, loyalty, rooms |
| `admin` | `/(admin)` | Event management, check-in, analytics |
| `merchant` | `/(merchant)` | Product & sales management |
| `super_admin` | `/(superadmin)` | Platform overview, admin management |

Role is detected on-chain at login and re-verified on every cold start.

## Build (EAS)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build Android APK
eas build --platform android --profile preview
```

EAS Project ID: `700d020d-6ebe-4036-9d38-68b59c8145c4`

## Notes

- MWA (Mobile Wallet Adapter) requires a dev build — Phantom deep-link signing does not work in Expo Go
- Android only — iOS support not implemented
- Solana Devnet is used for all on-chain operations
- Firebase Realtime Database is used for live chat and speak-request signalling in rooms
