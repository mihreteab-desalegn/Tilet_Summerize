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
const defaultAllowedOrigins = [
    "https://tilet-summerize.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
];

const envOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const allowedOriginsSet = new Set([...defaultAllowedOrigins, ...envOrigins]);

const isOriginAllowed = (origin) => {
    // Allow non-browser requests (server-to-server, curl, health checks)
    if (!origin) return true;

    const normalized = origin.trim().replace(/\/+$/, "");

    // Direct match against allowed set or wildcard
    if (allowedOriginsSet.has("*") || allowedOriginsSet.has(normalized)) return true;

    // Allow all onrender.com subdomains for frontend deployments/previews
    try {
        const parsed = new URL(normalized);
        if (parsed.hostname.endsWith(".onrender.com")) {
            return true;
        }
    } catch {
        // Invalid origin URL format
    }

    return false;
};

const corsOptions = {
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
            return callback(null, true);
        }
        console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
        return callback(null, false);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    credentials: true,
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

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
