export interface TCGPrices {
  source: "tcgplayer";
  market: number | null;
  low: number | null;
  mid: number | null;
  high: number | null;
  holoMarket: number | null;
}

type PriceVariant = { low: number; mid: number; high: number; market: number; directLow?: number | null };

export interface PokemonTCGCard {
  id: string;
  name: string;
  number: string;
  set: { name: string };
  images?: { small: string; large: string };
  tcgplayer?: {
    url: string;
    prices?: Record<string, PriceVariant>;
  };
}

const VARIANT_PRIORITY = [
  "holofoil", "1stEditionHolofoil", "unlimitedHolofoil",
  "normal", "unlimited", "reverseHolofoil", "1stEdition", "promo",
];

function bestVariant(prices: Record<string, PriceVariant>): PriceVariant | null {
  for (const key of VARIANT_PRIORITY) {
    if (prices[key]) return prices[key];
  }
  return Object.values(prices)[0] ?? null;
}

async function queryTCG(q: string, apiKey: string): Promise<PokemonTCGCard[]> {
  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=10&select=id,name,number,set,images,tcgplayer`;
  const headers: Record<string, string> = {};
  if (apiKey) headers["X-Api-Key"] = apiKey;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Pokemon TCG API ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { data: PokemonTCGCard[] };
  return data.data ?? [];
}

function cardNameMatches(apiName: string, queryName: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const a = normalize(apiName);
  const q = normalize(queryName);
  if (a === q) return true;
  // Allow prefix match only at a word boundary (e.g. "sylveon" matches "sylveon ex" but NOT "sylveonfoo")
  if (a.startsWith(q) && (a.length === q.length || a[q.length] === " ")) return true;
  if (q.startsWith(a) && (q.length === a.length || q[a.length] === " ")) return true;
  return false;
}

function cardNameExact(apiName: string, queryName: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  return normalize(apiName) === normalize(queryName);
}

function cardNumberMatches(apiNumber: string, queryNumber: string): boolean {
  if (!queryNumber) return true;
  const stripTotal = (n: string) => n.split("/")[0].replace(/^0+/, "").trim();
  return stripTotal(apiNumber) === stripTotal(queryNumber);
}

export async function fetchTCGPrice(
  name: string,
  setName: string,
  number: string
): Promise<{ card: PokemonTCGCard | null; prices: TCGPrices }> {
  const apiKey = process.env.POKEMON_TCG_API_KEY ?? "";
  const cardNum = number.includes("/") ? number.split("/")[0].trim() : number.trim();

  const empty: TCGPrices = { source: "tcgplayer", market: null, low: null, mid: null, high: null, holoMarket: null };

  // Query 1: exact name + number (most precise)
  // Query 2: exact name only
  const queries = [
    cardNum ? `name:"${name}" number:${cardNum}` : `name:"${name}"`,
    `name:"${name}"`,
  ];

  for (const q of queries) {
    console.log(`TCG query: ${q}`);
    let results: PokemonTCGCard[] = [];
    try {
      results = await queryTCG(q, apiKey);
    } catch (err) {
      console.error(`TCG query failed (${q}):`, err);
      continue;
    }

    console.log(`  → ${results.length} results`);

    // Only accept results where the name actually matches — no cross-card fallback
    const nameMatched = results.filter((c) => cardNameMatches(c.name, name));
    if (!nameMatched.length) {
      console.log(`  → no name match for "${name}"`);
      continue;
    }

    // Prefer exact name match (e.g. "Sylveon ex" over "Sylveon")
    const exactNameMatched = nameMatched.filter((c) => cardNameExact(c.name, name));
    const candidates = exactNameMatched.length ? exactNameMatched : nameMatched;

    const withNumber = candidates.filter((c) => cardNumberMatches(c.number, cardNum));
    const withSet = candidates.filter((c) =>
      c.set.name.toLowerCase().includes(setName.toLowerCase()) ||
      setName.toLowerCase().includes(c.set.name.toLowerCase())
    );
    const withPrices = candidates.filter((c) =>
      c.tcgplayer?.prices && Object.keys(c.tcgplayer.prices).length > 0
    );

    // If we have a card number, it must match — don't fall through to unrelated cards
    if (cardNum && !withNumber.length) {
      console.log(`  → no number match for "${cardNum}" among name-matched cards`);
      // Still continue to next query in case a broader query finds it
      continue;
    }

    const card =
      withNumber.find((c) => withSet.includes(c)) ??  // number + set (best)
      withNumber[0] ??                                  // number only
      withSet.find((c) => withPrices.includes(c)) ??   // set + prices
      withSet[0] ??                                     // set match
      withPrices[0] ??                                  // has prices — ONLY if no number provided
      candidates[0];                                    // last resort

    console.log(`  → matched: ${card.name} | ${card.set.name} | #${card.number}`);

    if (!card.tcgplayer?.prices || !Object.keys(card.tcgplayer.prices).length) {
      console.log(`  → card found but no TCGPlayer pricing available`);
      // Return the card metadata even without prices (useful for image URL)
      return { card, prices: empty };
    }

    console.log(`  → variants: ${JSON.stringify(Object.keys(card.tcgplayer.prices))}`);

    const variant = bestVariant(card.tcgplayer.prices);
    const holoVariant =
      card.tcgplayer.prices["holofoil"] ??
      card.tcgplayer.prices["1stEditionHolofoil"] ??
      card.tcgplayer.prices["unlimitedHolofoil"] ?? null;

    console.log(`  → market price: ${variant?.market}`);

    return {
      card,
      prices: {
        source: "tcgplayer",
        market: variant?.market ?? null,
        low: variant?.low ?? null,
        mid: variant?.mid ?? null,
        high: variant?.high ?? null,
        holoMarket: holoVariant?.market ?? null,
      },
    };
  }

  console.log(`  → no match found for "${name}"`);
  return { card: null, prices: empty };
}
