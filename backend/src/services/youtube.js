import ytSearch from "yt-search";

/**
 * Searches YouTube for a video by ID and returns full metadata.
 * Attempts direct ID lookup first (which returns full description),
 * then falls back to search query if needed.
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<object>} Video metadata object
 */
export const searchVideo = async (videoId) => {
    try {
        const direct = await ytSearch({ videoId });
        if (direct && direct.title) {
            return direct;
        }
    } catch {
        // Fallback to text search
    }

    const result = await ytSearch(videoId);
    if (!result || !result.videos || result.videos.length === 0) {
        const err = new Error("Video not found on YouTube.");
        err.status = 404;
        throw err;
    }

    return result.videos[0];
};
