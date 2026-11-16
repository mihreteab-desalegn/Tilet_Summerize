import { Router } from "express";
import { searchVideo } from "../services/youtube.js";
import { escapeHtml } from "../utils/htmlEscape.js";
import { isValidVideoId } from "../utils/videoId.js";

const router = Router();

const APP_URL = process.env.APP_URL || "https://tilet-summerize.onrender.com";

router.get("/:videoId", async (req, res, next) => {
    try {
        const { videoId } = req.params;

        if (!isValidVideoId(videoId)) {
            return res.status(400).send("Invalid video ID.");
        }

        const video = await searchVideo(videoId);

        const title       = escapeHtml(video.title || "Tilet — YouTube Video Summarizer");
        const description = escapeHtml(video.description || "Watch and summarize YouTube videos easily with Tilet.");
        const image       = escapeHtml(video.thumbnail || `${APP_URL}/video.jpg`);
        const videoUrl    = escapeHtml(`https://www.youtube.com/watch?v=${videoId}`);
        const appUrl      = escapeHtml(`${APP_URL}/detail/${videoId}`);

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Content-Security-Policy", "default-src 'none'; img-src https:; style-src 'unsafe-inline'");

        res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="title" content="${title}" />
  <meta name="description" content="${description}" />
  <meta property="og:type" content="video.other" />
  <meta property="og:url" content="${videoUrl}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta name="twitter:card" content="player" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
  <meta http-equiv="refresh" content="0; URL='${appUrl}'" />
</head>
<body><p>Redirecting to video page...</p></body>
</html>`);
    } catch (err) {
        next(err);
    }
});

export default router;
