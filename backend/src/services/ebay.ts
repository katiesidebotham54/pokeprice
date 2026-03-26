export interface EbaySale {
  title: string;
  price: number;
  currency: string;
  soldDate: string;
  url: string;
}

export interface GradedPrice {
  grade: number;   // 8, 8.5, 9, 9.5, 10
  label: string;   // "PSA 10", "PSA 9.5", etc.
  median: number | null;
  low: number | null;
  high: number | null;
  sampleSize: number;
}

export interface EbayPrices {
  source: "ebay";
  median: number | null;
  low: number | null;
  high: number | null;
  recentSales: EbaySale[];
  trend: "up" | "down" | "stable" | null;
  graded: GradedPrice[];
}

interface EbayFindingItem {
  title: string[];
  sellingStatus: { convertedCurrentPrice: { __value__: string; "@currencyId": string }[] }[];
  listingInfo: { endTime: string[] }[];
  viewItemURL: string[];
}

const GRADED_GRADES: { grade: number; label: string; patterns: RegExp[] }[] = [
  { grade: 10,  label: "PSA 10",  patterns: [/\bpsa\s*10\b/i, /\bpsa10\b/i] },
  { grade: 9.5, label: "PSA 9.5", patterns: [/\bpsa\s*9\.5\b/i] },
  { grade: 9,   label: "PSA 9",   patterns: [/\bpsa\s*9\b(?!\.)/i, /\bpsa9\b/i] },
  { grade: 8.5, label: "PSA 8.5", patterns: [/\bpsa\s*8\.5\b/i] },
  { grade: 8,   label: "PSA 8",   patterns: [/\bpsa\s*8\b(?!\.)/i, /\bpsa8\b/i] },
];

function detectGrade(title: string): number | null {
  for (const { grade, patterns } of GRADED_GRADES) {
    if (patterns.some((p) => p.test(title))) return grade;
  }
  return null;
}

function isRawListing(title: string): boolean {
  // Exclude graded listings from raw price calculation
  return !/\b(psa|bgs|cgc|ace|sgc)\b/i.test(title);
}

async function fetchCompletedItems(keywords: string): Promise<EbayFindingItem[]> {
  const appId = process.env.EBAY_APP_ID;
  if (!appId) return [];

  const url =
    `https://svcs.ebay.com/services/search/FindingService/v1` +
    `?OPERATION-NAME=findCompletedItems` +
    `&SERVICE-VERSION=1.0.0` +
    `&SECURITY-APPNAME=${appId}` +
    `&RESPONSE-DATA-FORMAT=JSON` +
    `&keywords=${encodeURIComponent(keywords)}` +
    `&itemFilter(0).name=SoldItemsOnly&itemFilter(0).value=true` +
    `&sortOrder=EndTimeSoonest` +
    `&paginationInput.entriesPerPage=50`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`eBay API error: ${res.status}`);

  const data = (await res.json()) as {
    findCompletedItemsResponse?: {
      ack?: string[];
      searchResult?: { item?: EbayFindingItem[] }[];
    }[];
  };

  const ack = data.findCompletedItemsResponse?.[0]?.ack?.[0];
  if (ack !== "Success" && ack !== "Warning") {
    console.warn("eBay response ack:", ack);
    return [];
  }

  return data.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item ?? [];
}

function itemToSale(item: EbayFindingItem): EbaySale | null {
  const priceStr = item.sellingStatus?.[0]?.convertedCurrentPrice?.[0]?.__value__;
  const price = parseFloat(priceStr ?? "0");
  if (!price) return null;
  return {
    title: item.title?.[0] ?? "",
    price,
    currency: item.sellingStatus?.[0]?.convertedCurrentPrice?.[0]?.["@currencyId"] ?? "USD",
    soldDate: item.listingInfo?.[0]?.endTime?.[0] ?? "",
    url: item.viewItemURL?.[0] ?? "",
  };
}

function computeMedian(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeTrend(older: number[], newer: number[]): "up" | "down" | "stable" {
  if (!older.length || !newer.length) return "stable";
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const delta = (avg(newer) - avg(older)) / avg(older);
  if (delta > 0.05) return "up";
  if (delta < -0.05) return "down";
  return "stable";
}

function buildGradedPrices(allSales: EbaySale[]): GradedPrice[] {
  return GRADED_GRADES.map(({ grade, label }) => {
    const gradeSales = allSales
      .filter((s) => detectGrade(s.title) === grade)
      .map((s) => s.price)
      .sort((a, b) => a - b);

    if (!gradeSales.length) {
      return { grade, label, median: null, low: null, high: null, sampleSize: 0 };
    }

    return {
      grade,
      label,
      median: parseFloat(computeMedian(gradeSales).toFixed(2)),
      low: gradeSales[0],
      high: gradeSales[gradeSales.length - 1],
      sampleSize: gradeSales.length,
    };
  });
}

export async function fetchEbayPrices(
  cardName: string,
  setName: string,
  cardNumber?: string
): Promise<EbayPrices> {
  if (!process.env.EBAY_APP_ID) {
    return { source: "ebay", median: null, low: null, high: null, recentSales: [], trend: null, graded: [] };
  }

  // Include card number in query when available to avoid mixing variants (e.g. Sylveon ex SIR vs holo)
  const numSuffix = cardNumber ? ` ${cardNumber.split("/")[0]}` : "";
  const [rawItems, gradedItems] = await Promise.allSettled([
    fetchCompletedItems(`pokemon ${cardName}${numSuffix} ${setName}`),
    fetchCompletedItems(`pokemon ${cardName}${numSuffix} ${setName} PSA`),
  ]);

  const rawSales: EbaySale[] = [];
  const gradedSales: EbaySale[] = [];

  if (rawItems.status === "fulfilled") {
    for (const item of rawItems.value) {
      const sale = itemToSale(item);
      if (sale && isRawListing(sale.title)) rawSales.push(sale);
    }
  }

  if (gradedItems.status === "fulfilled") {
    for (const item of gradedItems.value) {
      const sale = itemToSale(item);
      if (sale && detectGrade(sale.title) !== null) gradedSales.push(sale);
    }
  }

  // Raw pricing
  const rawPrices = rawSales.map((s) => s.price).sort((a, b) => a - b);
  const median = rawPrices.length ? parseFloat(computeMedian(rawPrices).toFixed(2)) : null;
  const low = rawPrices[0] ?? null;
  const high = rawPrices[rawPrices.length - 1] ?? null;

  const mid = Math.floor(rawSales.length / 2);
  const trend = rawSales.length >= 4
    ? computeTrend(rawSales.slice(0, mid).map((s) => s.price), rawSales.slice(mid).map((s) => s.price))
    : null;

  console.log(`eBay raw: ${rawSales.length} sales, median=$${median}`);
  console.log(`eBay graded: ${gradedSales.length} graded sales`);

  return {
    source: "ebay",
    median,
    low,
    high,
    recentSales: rawSales.slice(0, 10),
    trend,
    graded: buildGradedPrices(gradedSales),
  };
}
