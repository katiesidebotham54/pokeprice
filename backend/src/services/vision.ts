import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface CardIdentity {
  name: string;
  set: string;
  number: string;
  rarity: string;
  confidence: number;
}

function extractJSON(text: string): string {
  // Strip markdown code fences e.g. ```json { ... } ```
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Extract first {...} block
  const braces = text.match(/\{[\s\S]*\}/);
  if (braces) return braces[0];
  return text.trim();
}

export async function identifyCard(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg"
): Promise<CardIdentity> {
  console.log(`Sending image to Claude (${Math.round(base64Image.length / 1024)}KB base64)`);

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Image },
          },
          {
            type: "text",
            text: `Identify this Pokémon card precisely. Return ONLY raw JSON, no markdown:
{"name":"<full name — include ex/V/GX/VMAX/VSTAR/EX suffix exactly as printed>","set":"<exact set name from card>","number":"<full number e.g. 229/231 — read bottom carefully>","rarity":"<rarity>","confidence":<0.0-1.0>}
The card number is critical for accurate pricing. Read it exactly as printed at the bottom (e.g. 229/231). Always include ex/V/VMAX/VSTAR in the name if present.
If unreadable: {"name":"Unknown","set":"Unknown","number":"Unknown","rarity":"Unknown","confidence":0}`,
          },
        ],
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  console.log("Claude raw response:", raw);

  const jsonStr = extractJSON(raw);
  console.log("Extracted JSON:", jsonStr);

  const parsed = JSON.parse(jsonStr) as CardIdentity;

  // Ensure confidence is a number
  parsed.confidence = Number(parsed.confidence) || 0;
  return parsed;
}
