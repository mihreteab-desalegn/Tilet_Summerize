/** In-memory cache with TTL. For production, replace with Redis. */

const store = new Map();
const TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Returns cached value for key, or null if missing / expired.
 * @param {string} key
 * @returns {object|null}
 */
export const getCache = (key) => {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > TTL_MS) {
        store.delete(key);
        return null;
    }
    return entry.data;
};

/**
 * Stores a value in the cache with the current timestamp.
 * @param {string} key
 * @param {object} data
 */
export const setCache = (key, data) => {
    store.set(key, { data, timestamp: Date.now() });
};

/**
 * Removes a specific key from the cache.
 * @param {string} key
 */
export const deleteCache = (key) => {
    store.delete(key);
};

/** Returns cache size (for health checks). */
export const cacheSize = () => store.size;
