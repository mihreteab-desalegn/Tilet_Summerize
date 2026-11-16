import { fetchTranscript as getTranscript } from "youtube-transcript-plus";

/**
 * Fetches the full transcript for a YouTube video and joins it into a single string.
 * Throws if no transcript is available or if transcript is empty.
 * @param {string} videoId - 11-character YouTube video ID
 * @returns {Promise<string>}
 */
export const fetchTranscript = async (videoId) => {
    const segments = await getTranscript(videoId);
    if (!segments || segments.length === 0) {
        throw new Error("No transcript segments found");
    }

    const text = segments
        .map((t) => t.text)
        .join(" ")
        .trim();

    if (!text) {
        throw new Error("Transcript text was empty");
    }

    // Clean up HTML entities
    return text
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
};
