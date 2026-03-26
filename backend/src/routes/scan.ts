import { Router, Request, Response } from "express";
import { identifyCard } from "../services/vision";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { image, mediaType } = req.body as {
      image: string;
      mediaType?: "image/jpeg" | "image/png" | "image/webp";
    };

    if (!image) {
      res.status(400).json({ error: "image (base64) is required" });
      return;
    }

    const card = await identifyCard(image, mediaType ?? "image/jpeg");
    res.json(card);
  } catch (err) {
    console.error("Scan error:", err);
    res.status(500).json({ error: "Failed to identify card" });
  }
});

export default router;
