import { TCGPrices } from "../services/tcg";
import { EbayPrices, GradedPrice } from "../services/ebay";
import { PriceChartingPrices } from "../services/pricecharting";

export interface AggregatedPrice {
  // Ungraded estimate (median across all ungraded sources)
  median: number | null;
  low: number | null;
  high: number | null;
  trend: "up" | "down" | "stable" | null;
  // Per-source ungraded breakdown
  tcgplayer: {
    market: number | null;
    low: number | null;
    high: number | null;
  };
  ebay: {
    median: number | null;
    low: number | null;
    high: number | null;
    recentSales: EbayPrices["recentSales"];
  };
  // PSA graded data from eBay sold listings
  graded: GradedPrice[];
  // PriceCharting reference prices (ungraded + graded)
  pricecharting: PriceChartingPrices | null;
  sources: string[];
}

export function aggregatePrices(
  tcg: TCGPrices,
  ebay: EbayPrices,
  pc: PriceChartingPrices | null
): AggregatedPrice {
  // Ungraded price: TCGPlayer market is primary (most accurate real-time price).
  // eBay raw median supplements when TCGPlayer is missing.
  // PriceCharting is reference-only and shown separately — NOT averaged in, as it
  // can lag behind the market and drag down the displayed price significantly.
  const median =
    tcg.market != null ? tcg.market :
    ebay.median != null ? ebay.median :
    pc?.loose ?? null;

  const allLows = [tcg.low, ebay.low].filter((v): v is number => v != null);
  const allHighs = [tcg.high, ebay.high].filter((v): v is number => v != null);

  const sources: string[] = [];
  if (tcg.market != null) sources.push("TCGPlayer");
  if (ebay.median != null) sources.push("eBay sold");
  if (pc?.loose != null) sources.push("PriceCharting");

  return {
    median,
    low: allLows.length ? Math.min(...allLows) : null,
    high: allHighs.length ? Math.max(...allHighs) : null,
    trend: ebay.trend,
    tcgplayer: { market: tcg.market, low: tcg.low, high: tcg.high },
    ebay: { median: ebay.median, low: ebay.low, high: ebay.high, recentSales: ebay.recentSales },
    graded: ebay.graded,
    pricecharting: pc?.loose != null || pc?.psa9 != null || pc?.psa10 != null ? pc : null,
    sources,
  };
}
