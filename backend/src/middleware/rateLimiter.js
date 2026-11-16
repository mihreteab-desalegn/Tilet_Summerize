import rateLimit from "express-rate-limit";

/** Strict limiter for the AI processing endpoints — prevents quota abuse. */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please wait a minute before trying again." },
});

/** Relaxed limiter for the preview/social-share endpoints. */
export const previewLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests.",
});
