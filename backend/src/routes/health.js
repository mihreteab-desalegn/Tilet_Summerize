import { Router } from "express";
import { cacheSize } from "../services/cache.js";

const router = Router();

router.get("/", (req, res) => {
    res.json({
        status: "ok",
        uptime: Math.round(process.uptime()),
        cache: { entries: cacheSize() },
        timestamp: new Date().toISOString(),
    });
});

export default router;
