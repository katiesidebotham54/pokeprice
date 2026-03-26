# PokePrice

Instant Pokémon card pricing from your phone. Point the camera at any card, get real-time market prices across multiple sources — ungraded and PSA graded.

---

## What It Does

- **Scan a card** using the live camera or upload from your gallery
- **Identify the card** automatically (name, set, number, rarity) using Claude AI vision
- **Fetch pricing** from TCGPlayer, eBay sold listings, and PriceCharting in parallel
- **View ungraded and graded (PSA) prices** side by side with per-source breakdowns
- **Save cards** to a personal collection with estimated portfolio value

---

## App Screenshots

| Home | Camera | Results | Collection |
|------|--------|---------|------------|
| Scan frame + gallery upload | Live card detection with zone overlay | Ungraded + PSA graded prices | Saved cards + total value |

---

## Tech Stack

### Frontend — `app/`
| Technology | Version | Purpose |
|---|---|---|
| React Native | 0.81.5 | Cross-platform mobile UI |
| Expo SDK | ~54.0.0 | Build tooling, camera, image APIs |
| TypeScript | ~5.9.2 | Type safety |
| React Navigation (native-stack) | ^7 | Screen routing |
| Zustand | ^5 | Lightweight global state |
| expo-camera | ~17.0.10 | Live camera feed |
| expo-image-manipulator | ~14.0.8 | Resize/compress before upload |
| expo-image-picker | ~17.0.10 | Gallery access |
| AsyncStorage | 2.2.0 | Persistent local collection |

### Backend — `backend/`
| Technology | Version | Purpose |
|---|---|---|
| Node.js + Express | ^4.18 | REST API server |
| TypeScript | ^5.3 | Type safety |
| Anthropic SDK | ^0.39 | Claude vision API client |
| ts-node-dev | ^2.0 | Hot-reload dev server |

---

## Integrations

### Claude AI (Anthropic)
- Model: `claude-haiku-4-5` for fast card identification
- Receives a base64-encoded JPEG (resized to 768px) and returns card name, set, number, rarity, and confidence score
- Falls back gracefully with a low-confidence alert if the card can't be read clearly

### Pokémon TCG API
- Queries `api.pokemontcg.io/v2/cards` by card name + number
- Returns TCGPlayer market/low/high prices and official card image URLs
- Smart matching: prefers exact name + number → exact name + set → set + prices
- Handles variant types: holofoil, reverse holo, 1st edition, normal

### eBay Finding Service API
- Queries `findCompletedItems` for raw (ungraded) sold listings
- Separate query for PSA-graded listings to build grade-specific price ranges
- Computes median, low, high, and price trend (up/down/stable) from recent sales
- Includes card number in search query to avoid mixing variants (e.g. Sylveon ex SIR vs regular holo)
- **Note:** Requires eBay `findCompletedItems` access approval (exception form)

### PriceCharting
- Queries `pricecharting.com/api/product` for reference prices
- Returns loose (ungraded), PSA 10, PSA 9, PSA 9.5, and grade 7 prices
- Used as supplementary reference data — does not affect the primary displayed price
- Requires a PriceCharting API key

---

## Pricing Logic

Prices are fetched from all three sources in parallel via `Promise.allSettled`.

**Ungraded price** (priority order):
1. TCGPlayer market price — primary source, most accurate real-time data
2. eBay raw sold median — used when TCGPlayer is unavailable
3. PriceCharting loose — fallback reference only

**Graded (PSA) prices**: sourced from eBay sold listings filtered by grade label (PSA 10, 9.5, 9, 8.5, 8). PriceCharting reference prices shown alongside.

**Why not average sources?** Averaging TCGPlayer with stale PriceCharting data can significantly understate the market price for rare/special cards. TCGPlayer reflects live marketplace data and is treated as authoritative.

---

## Project Structure

```
pokeprice/
├── app/                         # Expo React Native app
│   ├── App.tsx                  # Navigation root
│   ├── app.json                 # Expo config
│   ├── assets/                  # Icons, splash, app images
│   └── src/
│       ├── api/
│       │   └── client.ts        # Fetch wrappers for /scan and /price
│       ├── components/
│       │   └── Pokeball.tsx     # Reusable Pokeball icon component
│       ├── screens/
│       │   ├── HomeScreen.tsx   # Scan + gallery upload entry point
│       │   ├── CameraScreen.tsx # Live camera with card detection UI
│       │   ├── ResultScreen.tsx # Pricing results display
│       │   └── CollectionScreen.tsx # Saved card portfolio
│       ├── store/
│       │   ├── useCardStore.ts       # Current scan state (Zustand)
│       │   └── useCollectionStore.ts # Saved cards (Zustand + AsyncStorage)
│       └── theme.ts             # Design tokens (colors, shadows)
│
└── backend/                     # Express API server
    └── src/
        ├── index.ts             # Server entry, CORS, routes
        ├── routes/
        │   ├── scan.ts          # POST /scan — card identification
        │   └── price.ts         # GET /price — pricing aggregation
        │                        # GET /price/debug — raw TCG match debug
        ├── services/
        │   ├── vision.ts        # Claude Haiku card identification
        │   ├── tcg.ts           # Pokémon TCG API + TCGPlayer prices
        │   ├── ebay.ts          # eBay sold listings (raw + graded)
        │   └── pricecharting.ts # PriceCharting reference prices
        └── utils/
            └── aggregate.ts     # Multi-source price aggregation logic
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator / Android Emulator, or Expo Go on a physical device

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in your API keys in .env
npm run dev
```

### Frontend

```bash
cd app
npm install
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your backend address (e.g. http://192.168.x.x:3000)
npx expo start
```

### Environment Variables

**`backend/.env`**
```
ANTHROPIC_API_KEY=        # Required — Claude vision for card ID
POKEMON_TCG_API_KEY=      # Optional — higher rate limits
EBAY_APP_ID=              # Required for eBay pricing (needs findCompletedItems access)
PRICECHARTING_API_KEY=    # Optional — PriceCharting reference prices
PORT=3000
```

**`app/.env`**
```
EXPO_PUBLIC_API_URL=http://localhost:3000
```

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/scan` | Identify a card from base64 image |
| `GET` | `/price?name=&set=&number=` | Fetch aggregated pricing |
| `GET` | `/price/debug?name=&set=&number=` | Raw TCGPlayer match + all variants |

---

## Design

- Light theme with Pokémon brand colors: **Blue** `#4B90DC` · **Green** `#4CB87A` · **Yellow** `#FFCB05`
- Pokeball-style camera shutter button
- Animated card detection UI: scan beam, zone labels (Name/HP, Art, Attacks, Set), corner brackets that shift from white → blue → green as the card is detected
- Navigate-first UX: results screen appears immediately after card ID, pricing loads in the background
