# Technical Design Document (TDD)

## Product: CardSnap

## Objective
Design a high-performance, scalable system for real-time Pokémon card scanning and pricing that prioritizes:
- Speed (<2s end-to-end)
- Accuracy (>95% identification)
- Efficiency (low latency + minimal compute)
- Simplicity (clean UX, minimal friction)

---

# 1. System Overview

## High-Level Architecture

Mobile App (React Native / Expo)
        ↓
Edge API Layer (Fast API Gateway)
        ↓
Core Services:
  - Vision Service (Card Identification)
  - Pricing Service (Real-time aggregation)
  - Card Metadata Service
        ↓
Data Sources:
  - eBay sold listings
  - TCG marketplaces
  - Web search APIs (Exa)

---

# 2. Core Design Principles

### 1. Speed First
- All operations optimized for <2s response
- Use async pipelines and parallel requests

### 2. Progressive Accuracy
- Fast initial guess → refine in background
- Return usable result instantly, improve if needed

### 3. Hybrid AI Approach
- Combine:
  - Image recognition
  - OCR (card number)
  - Database lookup

### 4. Human-in-the-Loop
- Always allow instant correction
- Use corrections to improve system

---

# 3. Frontend Architecture

## Stack
- React Native (Expo)
- TypeScript
- Zustand (state management)

## Key Modules

### Camera Module
- Continuous frame capture (not single photo)
- Frame sampling (e.g., every 200ms)
- Lightweight preprocessing on-device

### Scan Engine (Client-Side)
- Bounding box detection (basic edge detection)
- Frame stabilization
- Select best frame for processing

### UI Flow

#### Single Scan
1. Camera opens instantly
2. Card detected automatically
3. Loading state (<500ms)
4. Price displayed

#### Bulk Mode
1. Continuous detection
2. Auto-add to queue
3. Swipe to confirm/correct

## Performance Optimizations
- Compress images before upload
- Send cropped card region only
- Use WebP format

---

# 4. Vision Service (Card Identification)

## Goals
- <500ms identification time
- >95% accuracy

## Pipeline

### Step 1: Image Preprocessing
- Resize image (e.g., 224x224)
- Normalize lighting
- Crop to card boundaries

### Step 2: OCR Extraction
- Extract:
  - Card number (e.g., 25/102)
  - Name text

Tools:
- Tesseract OR lightweight on-device OCR

### Step 3: Image Matching

Approach:
- Precomputed embeddings of all Pokémon cards
- Use:
  - CNN or Vision Transformer

Process:
1. Generate embedding for input image
2. Compare against database (vector similarity search)
3. Return top 3 matches

Tools:
- FAISS or Pinecone

### Step 4: Fusion Layer
- Combine:
  - OCR result
  - Image similarity

- Rank candidates
- Output:
  - Best match
  - Confidence score

### Step 5: Fallback
- If confidence < threshold:
  - Return top 3 options
  - Ask user to confirm

---

# 5. Pricing Service

## Goals
- Real-time, trustworthy pricing
- No fake/estimated values

## Data Sources
- eBay sold listings (primary)
- TCGplayer (secondary)
- Web search via Exa

## Pipeline

### Step 1: Query Generation
- Use card name + set + number
- Generate search queries dynamically

### Step 2: Data Fetching (Parallel)
- Fetch from multiple sources simultaneously

### Step 3: Cleaning
- Remove:
  - Auctions not completed
  - Mislisted items
  - Extreme outliers

### Step 4: Normalization
- Convert currencies
- Normalize condition labels

### Step 5: Aggregation
- Compute:
  - Median price
  - Price range
  - Recent trend

### Step 6: Graded Split
- Separate listings into:
  - Raw
  - PSA 10
  - PSA 9

---

# 6. API Design

## Endpoint: /scan
POST

Input:
- image (cropped)

Output:
- card_id
- name
- set
- confidence

---

## Endpoint: /price
GET

Input:
- card_id

Output:
- median_price
- recent_sales[]
- trend
- graded_prices

---

## Endpoint: /bulk
POST

Input:
- multiple images

Output:
- array of card + price

---

# 7. Data Layer

## Card Database
- Full Pokémon card dataset
- Includes:
  - Images
  - Metadata

## Vector Database
- Store embeddings for fast lookup

## Cache Layer
- Redis

Caching Strategy:
- Cache pricing for 5–15 minutes
- Cache popular cards longer

---

# 8. Performance Strategy

## Latency Targets
- Vision: <500ms
- Pricing: <1s
- Total: <2s

## Techniques
- Parallel API calls
- Edge caching
- Lazy loading details

---

# 9. Bulk Scanning Design (Key Differentiator)

## Approach
- Continuous video stream
- Detect cards frame-by-frame

## Logic
- Deduplicate cards using hash
- Auto-add new cards
- Ignore duplicates within time window

## UX
- Live counter of scanned cards
- Queue review system

---

# 10. Error Handling

- Low confidence → show options
- No pricing data → show last known
- Network failure → retry silently

---

# 11. Security & Rate Limiting

- API rate limits per user
- Prevent scraping abuse

---

# 12. Future Enhancements

- On-device ML for offline scanning
- Condition detection via CV
- AI grading predictions

---

# 13. MVP Implementation Plan

## Week 1
- Camera + scan UI
- Basic image upload

## Week 2
- Vision model integration
- Card identification working

## Week 3
- Pricing pipeline (eBay)
- Median price display

## Week 4
- Bulk scanning (basic)
- Performance optimization

---

# 14. Key Differentiators (Technical)

1. Multi-frame detection (not single image)
2. Hybrid OCR + vision model
3. Real-time sold data (not estimates)
4. Bulk scanning pipeline
5. Sub-2 second response time

---

# Final Note

This system is designed to feel instant, trustworthy, and frictionless. Every technical decision should optimize for:

"Scan → Price → Done" in under 2 seconds.

