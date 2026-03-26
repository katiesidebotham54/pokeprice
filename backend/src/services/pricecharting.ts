export interface PriceChartingPrices {
  source: "pricecharting";
  loose: number | null;    // ungraded raw card
  psa10: number | null;    // manual-only-price  (PSA 10)
  psa9: number | null;     // graded-price       (PSA 9)
  psa95: number | null;    // box-only-price     (PSA 9.5)
  grade7: number | null;   // cib-price          (PSA 7–7.5)
  productName: string | null;
}

function centsToUSD(val: unknown): number | null {
  if (typeof val !== "number" || val <= 0) return null;
  return parseFloat((val / 100).toFixed(2));
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function fetchPriceCharting(
  cardName: string,
  setName: string,
  number: string
): Promise<PriceChartingPrices> {
  const empty: PriceChartingPrices = {
    source: "pricecharting",
    loose: null, psa10: null, psa9: null, psa95: null, grade7: null,
    productName: null,
  };

  const token = process.env.PRICECHARTING_API_KEY;
  if (!token) {
    console.log("PriceCharting: no API key set, skipping");
    return empty;
  }

  const cardNum = number.includes("/") ? number.split("/")[0].trim() : number.trim();

  // Try most specific query first, fall back to name + set
  const queries = [
    [cardName, setName, cardNum].filter(Boolean).join(" "),
    [cardName, setName].filter(Boolean).join(" "),
    cardName,
  ];

  for (const q of queries) {
    try {
      console.log(`PriceCharting query: "${q}"`);
      const url = `https://www.pricecharting.com/api/product?t=${encodeURIComponent(token)}&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

      if (!res.ok) {
        console.warn(`PriceCharting HTTP ${res.status}`);
        continue;
      }

      const data = (await res.json()) as Record<string, unknown>;

      // API returns status "200" (string) on success
      if (data["status"] !== "200" && data["status"] !== 200) {
        console.warn(`PriceCharting status: ${data["status"]}`);
        continue;
      }

      const productName = String(data["product-name"] ?? "");

      // Ensure the result is at least loosely the right card
      if (!normalize(productName).includes(normalize(cardName))) {
        console.log(`PriceCharting: name mismatch "${productName}" vs "${cardName}"`);
        continue;
      }

      console.log(`PriceCharting matched: ${productName}`);

      return {
        source: "pricecharting",
        loose: centsToUSD(data["loose-price"]),
        psa10: centsToUSD(data["manual-only-price"]),
        psa9: centsToUSD(data["graded-price"]),
        psa95: centsToUSD(data["box-only-price"]),
        grade7: centsToUSD(data["cib-price"]),
        productName,
      };
    } catch (err) {
      console.error(`PriceCharting query failed ("${q}"):`, err);
      continue;
    }
  }

  console.log(`PriceCharting: no match found for "${cardName}"`);
  return empty;
}
