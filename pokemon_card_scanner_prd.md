# Product Requirements Document (PRD)

## Product Name
CardSnap (working title)

## Overview
CardSnap is a mobile-first application that allows users to scan Pokémon cards (single or bulk) and instantly receive accurate, transparent, and real-time pricing data for both raw and graded cards. The product focuses on speed, accuracy, and trust by leveraging advanced computer vision and real-time web data aggregation.

## Problem Statement
Existing Pokémon card scanner apps suffer from:
- Poor scan accuracy in real-world conditions
- Inaccurate or outdated pricing
- Lack of transparency in pricing sources
- Inefficient bulk scanning workflows
- Weak support for graded cards and condition-based pricing

Users want a fast, reliable, and trustworthy way to understand the value of their cards without friction.

## Goals & Success Metrics

### Goals
1. Deliver near-instant card identification (<1 second)
2. Provide highly accurate pricing based on real sold data
3. Enable seamless bulk scanning of large collections
4. Build user trust through transparent pricing sources

### Success Metrics
- Scan accuracy rate > 95%
- Average scan-to-price time < 2 seconds
- User retention (Day 7) > 30%
- Average session length > 3 minutes
- % of scans requiring manual correction < 10%

## Target Users

### Primary
- Casual Pokémon card owners
- Collectors organizing collections

### Secondary
- Resellers / flippers
- Local card shop owners

## Core Features

### 1. AI Card Identification
- Real-time camera scanning
- Multi-frame detection (video-based recognition)
- OCR for card number + set identification
- Confidence scoring
- Quick correction UI (tap to fix incorrect match)

### 2. Bulk Scanning Mode (Key Differentiator)
- Continuous scan mode (no button press required)
- Auto-detect + auto-capture
- Queue system for scanned cards
- Swipe/quick confirm workflow
- Designed for scanning 100–1000+ cards efficiently

### 3. Real-Time Pricing Engine
- Aggregates data from:
  - eBay sold listings
  - TCG marketplaces
  - Other relevant marketplaces via web search APIs (e.g., Exa)

- Outputs:
  - Median price
  - Last 5–10 sold listings
  - Price trend (up/down)
  - Price range (low–high)

### 4. Graded vs Raw Pricing
- Separate pricing for:
  - Raw (ungraded)
  - PSA 10
  - PSA 9
  - Other grades (future expansion)

### 5. Condition Adjustment
- User selects condition:
  - Near Mint (NM)
  - Lightly Played (LP)
  - Moderately Played (MP)
  - Heavily Played (HP)

- Price adjusts based on historical spreads

### 6. Transparency Layer (Trust Feature)
- “Why this price?” breakdown
- View underlying listings
- Source attribution (e.g., eBay sold listings)

### 7. Collection Management (Phase 2)
- Save scanned cards
- Portfolio value tracking
- Price change alerts

## User Experience

### Core Flow (Single Scan)
1. Open app
2. Point camera at card
3. Card auto-detected
4. Price appears instantly
5. Optional: view details or save

### Bulk Flow
1. Enter bulk mode
2. Move camera over cards
3. Cards auto-detected and added to queue
4. User reviews quickly (swipe confirm)
5. Bulk pricing summary displayed

## Technical Architecture

### Frontend
- React Native (Expo)
- Camera integration (live feed processing)

### Backend
- Node.js / Python services
- Real-time pricing aggregation layer

### AI / ML Components

#### Card Recognition
- CNN / Vision Transformer model for image matching
- OCR (card number, name)
- Dataset: Pokémon card image database

#### Pricing Engine
- Exa AI (or similar) for real-time search
- Scraping / APIs for:
  - eBay sold listings
  - TCGplayer

- Data processing:
  - Deduplicate listings
  - Remove outliers
  - Compute median and trend

### Infrastructure
- Cloud hosting (AWS/GCP)
- CDN for image assets
- Low-latency APIs for real-time response

## Risks & Mitigations

### Risk: Poor scan accuracy
Mitigation:
- Multi-frame detection
- Hybrid OCR + image matching
- Human-in-the-loop correction UX

### Risk: Inaccurate pricing data
Mitigation:
- Use sold listings only
- Outlier filtering
- Multiple data sources

### Risk: API/scraping limitations
Mitigation:
- Redundant data providers
- Caching layer

### Risk: Legal/IP concerns
Mitigation:
- Avoid copyrighted assets storage where possible
- Use publicly available data responsibly

## MVP Scope (2–4 Weeks)

### Must Have
- Single card scanning
- Basic card identification
- eBay sold listings integration
- Median price display

### Nice to Have
- Bulk scanning (basic version)
- Price trend indicator

### Not in MVP
- Full collection tracking
- Advanced grading breakdown

## Future Opportunities
- Marketplace integration (buy/sell directly)
- Social features (share collections)
- AI grading estimation from photos
- Expansion to other TCGs (Magic, Yu-Gi-Oh)

## Positioning

"The fastest and most accurate Pokémon card pricing app — powered by real sales, not guesses."

