import express from "express";
import cors from "cors";
import ytSearch from "yt-search";
import { YoutubeTranscript } from "youtube-transcript";
import dotenv from "dotenv";
import fetch from "node-fetch"; // for Node < 18

dotenv.config();
const app = express();
const PORT = 5000;

app.use(cors({
  origin: 'https://tilet-summerize.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

function extractVideoId(url) {
  const match = url.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}

async function summarizeTextGemini(text) {
  const API_KEY = process.env.GEMINI_API_KEY;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: `Summarize the following video content for students.

Summarize the following video transcript or description for students using a friendly tone, clear subtopic headings with emojis, bullet points for key ideas, interactive prompts (like Tip or facts), and include a title, short intro, main content sections, a quick recap, examples that interact with real life, and a conclusion to make it engaging and study-friendly. Before each subtopic add one blank line, and provide detailed explanations with a few emojis. Use different font sizes depending on the situation, bullet points, numbers, and indentation for interactive structure.

Content to summarize: \n\n${text}`
          }
        ]
      }
    ]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No summary returned.";
}

async function generateMcqsFromSummary(summary) {
  const API_KEY = process.env.GEMINI_API_KEY;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: `Based on the following educational summary, generate 20 multiple-choice questions in JSON format. Each question should include:

- id (string or number)
- question (string)
- choices (array of 4 strings)
- answer (string)
- explanation (string explaining why the correct answer is right and others are wrong)

Respond ONLY with a JSON array of 15 questions. No extra text or formatting.

Summary:\n\n${summary}`
          }
        ]
      }
    ]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini MCQ API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

  // Clean up code blocks if present
  rawText = rawText.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();

  console.log("Raw MCQs:", rawText);

  return rawText;
}

app.post("/api/process", async (req, res) => {
  const { url } = req.body;

  if (!url || !/^https?:\/\/(www\.)?youtube\.com\/watch\?v=/.test(url)) {
    return res.status(400).json({ error: "Invalid YouTube URL." });
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return res.status(400).json({ error: "Cannot extract video ID." });
  }

  try {
    const result = await ytSearch(videoId);

    if (!result || !result.videos || result.videos.length === 0) {
      return res.status(404).json({ error: "Video not found." });
    }

    const video = result.videos[0];
    let transcriptText = "";
    let summary = "";
    let mcqs = [];

    try {
      // Try to fetch transcript first
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      transcriptText = transcript.map(t => t.text).join(" ");

      summary = await summarizeTextGemini(transcriptText);
      mcqs = await generateMcqsFromSummary(summary);
    } catch (transcriptError) {
      console.warn("Transcript fetch failed:", transcriptError.message);

      // Fallback to summarizing video title + description
      const fallbackText = `${video.title}\n\n${video.description || ""}`;
      summary = await summarizeTextGemini(fallbackText);
      mcqs = await generateMcqsFromSummary(summary);
    }

    res.json({
      title: video.title,
      thumbnail: video.thumbnail,
      duration: video.timestamp,
      author: video.author.name,
      summary,
      transcript: transcriptText,
      mcqs
    });

  } catch (err) {
    console.error("Error processing video:", err);
    res.status(500).json({ error: "Failed to process the video." });
  }
});

// New SEO-friendly preview route for Telegram and social media
app.get("/preview/:videoId", async (req, res) => {
  const videoId = req.params.videoId;

  if (!videoId) {
    return res.status(400).send("Video ID is required.");
  }

  try {
    const result = await ytSearch(videoId);
    if (!result || !result.videos || result.videos.length === 0) {
      return res.status(404).send("Video not found.");
    }

    const video = result.videos[0];
    const title = video.title || "Tilet - YouTube Video Summarizer";
    const description = video.description || "Watch and summarize YouTube videos easily with Tilet.";
    const image = video.thumbnail || "https://tilet-summerize.onrender.com/default-thumbnail.jpg";
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    // Serve HTML with dynamic meta tags for SEO/social previews
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>

  <!-- Primary Meta Tags -->
  <meta name="title" content="${title}" />
  <meta name="description" content="${description}" />

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="video.other" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />

  <!-- Twitter -->
  <meta name="twitter:card" content="player" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
  <meta name="twitter:player" content="${url}" />
  <meta name="twitter:player:width" content="1280" />
  <meta name="twitter:player:height" content="720" />

  <meta http-equiv="refresh" content="0; URL='https://tilet-summerize.onrender.com/detail/${videoId}'" />
</head>
<body>
  <p>Redirecting to video page...</p>
</body>
</html>`);
  } catch (error) {
    console.error("Error generating preview page:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
