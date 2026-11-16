import { Router } from "express";
import { searchVideo } from "../services/youtube.js";
import { fetchTranscript } from "../services/transcript.js";
import { summarizeText, generateMcqs } from "../services/openrouter.js";
import { getCache, setCache, deleteCache } from "../services/cache.js";
import { extractVideoId, isValidVideoId } from "../utils/videoId.js";

const router = Router();

/** Builds and caches the full result object for a given video + language. */
const processVideo = async (url, language, onProgress) => {
    if (!/^https?:\/\/(www\.|music\.)?youtube\.com\/watch\?v=|^https?:\/\/youtu\.be\//.test(url)) {
        const err = new Error("Invalid YouTube URL.");
        err.status = 400;
        throw err;
    }

    const videoId = extractVideoId(url);
    if (!videoId || !isValidVideoId(videoId)) {
        const err = new Error("Cannot extract a valid video ID from that URL.");
        err.status = 400;
        throw err;
    }

    const cacheKey = `${videoId}:${language}`;
    const cached = getCache(cacheKey);
    if (cached) {
        onProgress?.("cached", "Loading from cache...");
        return cached;
    }

    onProgress?.("searching", "Searching for video...");
    const video = await searchVideo(videoId);

    let transcriptText = "";
    let summary = "";
    let mcqs = "";

    try {
        onProgress?.("transcript", "Fetching transcript...");
        transcriptText = await fetchTranscript(videoId);
    } catch {
        transcriptText = "";
    }

    const hasTranscript = typeof transcriptText === "string" && transcriptText.trim().length > 0;
    const textToSummarize = hasTranscript
        ? transcriptText
        : `${video.title}\n\n${video.description || ""}`;

    if (!hasTranscript) {
        onProgress?.("fallback", "No transcript found — summarizing from description...");
    }

    onProgress?.("summarizing", "Generating summary with AI...");
    summary = await summarizeText(textToSummarize);

    onProgress?.("mcqs", "Building quiz questions...");
    mcqs = await generateMcqs(summary);

    const result = {
        title:     video.title,
        thumbnail: video.thumbnail,
        duration:  video.timestamp,
        author:    video.author?.name || "Unknown",
        summary,
        transcript: transcriptText,
        mcqs,
    };

    setCache(cacheKey, result);
    return result;
};

/* ─── POST /api/process (standard JSON endpoint) ─────────────────────── */
router.post("/", async (req, res, next) => {
    try {
        const { url, language = "English", skipCache = false } = req.body;

        if (skipCache) {
            const videoId = extractVideoId(url);
            if (videoId) {
                deleteCache(`${videoId}:${language}`);
            }
        }

        const result = await processVideo(url, language);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

/* ─── GET /api/process/stream  (Server-Sent Events) ──────────────────── */
router.get("/stream", async (req, res) => {
    const { url, language = "English", skipCache } = req.query;

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx buffering
    res.flushHeaders();

    const send = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Keep-alive ping every 15s to prevent proxy timeouts
    const ping = setInterval(() => res.write(": ping\n\n"), 15_000);

    try {
        if (!url) {
            send("error", { message: "url query parameter is required." });
            return res.end();
        }

        if (skipCache === "true") {
            const videoId = extractVideoId(url);
            if (videoId) {
                deleteCache(`${videoId}:${language}`);
            }
        }

        const result = await processVideo(url, language, (step, message) => {
            send("progress", { step, message });
        });

        send("done", result);
    } catch (err) {
        send("error", { message: err.message || "Failed to process video." });
    } finally {
        clearInterval(ping);
        res.end();
    }
});

export default router;
