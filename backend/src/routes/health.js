import { Router } from "express";
import { cacheSize } from "../services/cache.js";

const router = Router();

router.get("/", (req, res) => {
    const hasKey = Boolean(
        process.env.OPENROUTER_API_KEY &&
        process.env.OPENROUTER_API_KEY !== "your_openrouter_api_key_here"
    );

    res.json({
        status: "ok",
        uptime: Math.round(process.uptime()),
        openrouter_configured: hasKey,
        model: process.env.OPENROUTER_MODEL || "openrouter/auto",
        cache: { entries: cacheSize() },
        timestamp: new Date().toISOString(),
    });
});

export default router;
