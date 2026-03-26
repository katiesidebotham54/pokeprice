import { Router, Request, Response } from "express";
import { fetchTCGPrice } from "../services/tcg";
import { fetchEbayPrices } from "../services/ebay";
import { fetchPriceCharting } from "../services/pricecharting";
import { aggregatePrices } from "../utils/aggregate";

const router = Router();

// Debug endpoint — e.g. GET /price/debug?name=Charizard&set=Base Set&number=4
router.get("/debug", async (req: Request, res: Response) => {
  const { name, set, number } = req.query as { name: string; set?: string; number?: string };
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  try {
    const result = await fetchTCGPrice(name, set ?? "", number ?? "");
    res.json({
      card: result.card
        ? { id: result.card.id, name: result.card.name, set: result.card.set.name, number: result.card.number }
        : null,
      prices: result.prices,
      rawVariants: result.card?.tcgplayer?.prices ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/", async (req: Request, res: Response) => {
  const { name, set, number } = req.query as {
    name: string;
    set: string;
    number: string;
  };

  if (!name) {
    res.status(400).json({ error: "name query param is required" });
    return;
  }

  try {
    // All three sources in parallel
    const [tcgResult, ebayResult, pcResult] = await Promise.allSettled([
      fetchTCGPrice(name, set ?? "", number ?? ""),
      fetchEbayPrices(name, set ?? "", number ?? ""),
      fetchPriceCharting(name, set ?? "", number ?? ""),
    ]);

    const tcgPrices =
      tcgResult.status === "fulfilled"
        ? tcgResult.value.prices
        : { source: "tcgplayer" as const, market: null, low: null, mid: null, high: null, holoMarket: null };

    const ebayPrices =
      ebayResult.status === "fulfilled"
        ? ebayResult.value
        : { source: "ebay" as const, median: null, low: null, high: null, recentSales: [], trend: null, graded: [] };

    const pcPrices =
      pcResult.status === "fulfilled" ? pcResult.value : null;

    const aggregated = aggregatePrices(tcgPrices, ebayPrices, pcPrices);

    const tcgCard = tcgResult.status === "fulfilled" ? tcgResult.value.card : null;
    const cardMeta = tcgCard
      ? {
          id: tcgCard.id,
          imageUrl: tcgCard.images?.large ?? tcgCard.images?.small ?? null,
          tcgplayerUrl: tcgCard.tcgplayer?.url ?? null,
        }
      : null;

    res.json({ ...aggregated, cardMeta });
  } catch (err) {
    console.error("Price error:", err);
    res.status(500).json({ error: "Failed to fetch pricing" });
  }
});

export default router;
