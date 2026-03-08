# PassPay Mobile

PassPay is a Solana-powered event experience app — buy tickets, earn loyalty rewards, pay merchants, and join live event meetings, all from your phone.

> Android only · Solana Devnet · Phantom Wallet required

## Related Repositories

| Repo | Description |
|------|-------------|
| [passpay-backend-web2](https://github.com/HarshUpadhyayXceedance/passpay-backend-web2) | Express backend — LiveKit rooms, meetings, Redis, Firebase |
| [Passpay_Backend](https://github.com/HarshUpadhyayXceedance/Passpay_Backend) | Solana program (Anchor) — on-chain ticketing, loyalty, payments |

---

## Features

### 🎟 Event Ticketing
- Browse and discover events
- Buy tickets with seat tier selection (Bronze, Silver, Gold, Platinum)
- Transfer tickets to other wallets
- QR code display for check-in at the venue

### 💰 Merchant Payments
- Scan merchant QR codes to pay in SOL
- Browse and purchase merchant products in-app
- Merchants can scan QR to confirm product pickup on-chain

### 🏆 Loyalty & Rewards
- Earn attendance badges at events
- Streak tracking across events
- Tier-based discounts (Bronze → Platinum) on tickets and payments
- Badge collection gallery

### 🎙 Live Event Meetings
- Ticket-gated audio/video rooms for online events
- Request to speak, admin grants/revokes mic
- Real-time chat inside meetings
- Host can end the meeting on-chain

### 🔊 Community Rooms
- Open audio rooms for all Solana users
- Seeker (SKR) token-gated rooms — permanent "Seeker Room" always available
- Create your own public or SKR-exclusive room
- Live chat, participant list, speaker controls

### 🔄 Dynamic Pricing
- Event admins can adjust a price multiplier
- All seat tiers scale proportionally in real-time

### 💸 Refunds & Cancellations
- Request refunds on unused tickets
- Automatic refund window when an event is cancelled
- On-chain refund tracking

### 👤 Role-Based Access
| Role | Access |
|------|--------|
| **User** | Events, tickets, shop, loyalty, community rooms |
| **Admin** | Create/manage events, check-in scanner, analytics, release funds |
| **Merchant** | Product management, QR invoice generation, sales history |
| **Super Admin** | Platform overview, register admins/merchants, badge setup |

Role is detected on-chain automatically when you connect your wallet.

---

## Getting Started

### Prerequisites
- [Phantom Wallet](https://phantom.app/) installed on your Android device
- SOL on Devnet ([Solana Faucet](https://faucet.solana.com/))

### Run Locally
```bash
npm install
npm start          # Expo dev server
```

### Build (EAS)
```bash
npm install -g eas-cli
eas build --platform android --profile preview
```

EAS Project ID: `700d020d-6ebe-4036-9d38-68b59c8145c4`

---

## Environment Variables

Create a `.env` file:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_DATABASE_URL=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

For EAS builds, add these under the `env` key in `eas.json` for each profile.
