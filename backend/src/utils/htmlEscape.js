/**
 * Escapes HTML special characters to prevent XSS injection.
 * @param {string} str - Raw string to escape
 * @returns {string} HTML-safe string
 */
export const escapeHtml = (str) => {
    if (!str || typeof str !== "string") return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};
