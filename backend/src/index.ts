import "dotenv/config";
import express from "express";
import cors from "cors";
import scanRouter from "./routes/scan";
import priceRouter from "./routes/price";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3000", 10);

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/scan", scanRouter);
app.use("/price", priceRouter);

app.listen(PORT, () => {
  console.log(`CardSnap backend running on http://localhost:${PORT}`);
});
