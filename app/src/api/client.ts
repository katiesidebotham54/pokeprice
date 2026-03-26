import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.0.21:3000";

export interface CardIdentity {
  name: string;
  set: string;
  number: string;
  rarity: string;
  confidence: number;
}

export interface EbaySale {
  title: string;
  price: number;
  currency: string;
  soldDate: string;
  url: string;
}

export interface GradedPrice {
  grade: number;
  label: string;
  median: number | null;
  low: number | null;
  high: number | null;
  sampleSize: number;
}

export interface PriceChartingPrices {
  loose: number | null;   // ungraded
  psa10: number | null;
  psa9: number | null;
  psa95: number | null;
  grade7: number | null;
  productName: string | null;
}

export interface PricingResult {
  // Ungraded estimate
  median: number | null;
  low: number | null;
  high: number | null;
  trend: "up" | "down" | "stable" | null;
  // Per-source ungraded breakdown
  tcgplayer: { market: number | null; low: number | null; high: number | null };
  ebay: { median: number | null; low: number | null; high: number | null; recentSales: EbaySale[] };
  // Graded (eBay actual sales)
  graded: GradedPrice[];
  // PriceCharting reference prices
  pricecharting: PriceChartingPrices | null;
  sources: string[];
  cardMeta: { id: string; imageUrl: string; tcgplayerUrl?: string } | null;
}

export async function scanCard(imageUri: string): Promise<CardIdentity> {
  // 768px is sufficient for card identification; smaller = less data = faster Claude response
  const manipulated = await manipulateAsync(
    imageUri,
    [{ resize: { width: 768 } }],
    { compress: 0.75, format: SaveFormat.JPEG, base64: true }
  );

  const base64 = manipulated.base64;
  if (!base64) throw new Error("Image processing failed — could not generate base64");

  const sizeKB = Math.round(base64.length / 1024);
  console.log(`Uploading image: ${sizeKB}KB`);

  const res = await fetch(`${BASE_URL}/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64, mediaType: "image/jpeg" }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Server error ${res.status}: ${body}`);
  }

  const data = await res.json() as CardIdentity;
  console.log("Scan result:", JSON.stringify(data));
  return data;
}

export async function fetchPricing(
  name: string,
  set: string,
  number: string
): Promise<PricingResult> {
  const params = new URLSearchParams({ name, set, number });
  const res = await fetch(`${BASE_URL}/price?${params}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Pricing error ${res.status}: ${body}`);
  }
  return res.json() as Promise<PricingResult>;
}
