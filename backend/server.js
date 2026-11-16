import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import processRouter from "./src/routes/process.js";
import previewRouter from "./src/routes/preview.js";
import healthRouter from "./src/routes/health.js";
import { apiLimiter, previewLimiter } from "./src/middleware/rateLimiter.js";
import { errorHandler } from "./src/middleware/errorHandler.js";

dotenv.config();

// ─── Environment Check ───────────────────────────────────────────────────────
if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === "your_openrouter_api_key_here") {
    console.warn("⚠️  WARNING: OPENROUTER_API_KEY is not configured in backend/.env. AI summarization requests will fail until a valid key is set.");
}

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim());

app.use(cors({
    origin: (origin, callback) => {
        // Allow server-to-server requests (no origin) or whitelisted origins
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
}));

app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/health", healthRouter);
app.use("/api/process", apiLimiter, processRouter);
app.use("/preview", previewLimiter, previewRouter);

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
    console.log(`🚀 Tilet server running at http://localhost:${PORT}`);
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
process.on("SIGTERM", () => {
    console.log("SIGTERM received — shutting down gracefully");
    server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
    });
});

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Promise Rejection:", reason);
    process.exit(1);
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    process.exit(1);
});

export default server;
