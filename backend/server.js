import express from "express";
import cors from "cors";
import ytSearch from "yt-search";
import { YoutubeTranscript } from "youtube-transcript";
import dotenv from "dotenv";
import fetch from "node-fetch"; // required for Node < 18

dotenv.config();
const app = express();
const PORT = 5000;

app.use(cors());
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
                        text: ` Summarize the following video content for students.

Summarize the following video transcript for students using a friendly tone, clear subtopic headings with emojis, bullet points for key ideas, interactive prompts (like Tip or facts), and include a title, short intro, main content sections, a quick recap, a examples that interact with real life, and a conclusion to make it engaging and study-friendly. before subtopic should be jump 1 line and each subtopic has very detail explanation with few emojis, and add further information and use different font size depend on situation and use bullet, number and use indentation for interactive structure. before each subtopic should be space from the previous text and after each subtopic should be space from the next text.

Transcript Summaries: \n\n${text}`
                    }
                ]
            }
        ]
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
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

    // Remove ```json or ``` wrappers if present
    rawText = rawText.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();

    console.log("Raw MCQs:");

    // ✅ Return rawText directly without parsing
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
            const transcript = await YoutubeTranscript.fetchTranscript(videoId);
            transcriptText = transcript.map(t => t.text).join(" ");

            summary = await summarizeTextGemini(transcriptText);
            mcqs = await generateMcqsFromSummary(summary);
        } catch (transcriptError) {
            console.warn("Transcript fetch failed:", transcriptError.message);
            summary = "Transcript not available or summarization failed.";
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

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
