/**
 * Validates that a string is a well-formed YouTube video ID (11 chars, alphanumeric/-/_).
 * @param {string} id
 * @returns {boolean}
 */
export const isValidVideoId = (id) =>
    typeof id === "string" && /^[a-zA-Z0-9_-]{11}$/.test(id);

/**
 * Extracts the video ID from various YouTube URL formats:
 *  - https://www.youtube.com/watch?v=XXXXXXXXXXX
 *  - https://youtu.be/XXXXXXXXXXX
 *  - https://www.youtube.com/embed/XXXXXXXXXXX
 *  - https://music.youtube.com/watch?v=XXXXXXXXXXX
 *  - https://www.youtube.com/shorts/XXXXXXXXXXX
 * @param {string} url
 * @returns {string|null}
 */
export const extractVideoId = (url) => {
    if (!url || typeof url !== "string") return null;

    try {
        const parsed = new URL(url);

        // Standard watch URL
        const v = parsed.searchParams.get("v");
        if (v && isValidVideoId(v)) return v;

        // youtu.be short links
        if (parsed.hostname === "youtu.be") {
            const id = parsed.pathname.slice(1).split("?")[0];
            if (isValidVideoId(id)) return id;
        }

        // /embed/ and /shorts/ paths
        const pathMatch = parsed.pathname.match(/\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/);
        if (pathMatch) return pathMatch[1];
    } catch {
        // Not a valid URL — try regex fallback
        const match = url.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
        if (match && isValidVideoId(match[1])) return match[1];
    }

    return null;
};
