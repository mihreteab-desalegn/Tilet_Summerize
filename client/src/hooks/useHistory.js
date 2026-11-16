import { useState } from "react";

const HISTORY_KEY = "tilet_history";
const MAX_ITEMS = 10;

/**
 * Manages a localStorage-persisted list of recently processed videos.
 */
export const useHistory = () => {
    const [history, setHistory] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
        } catch {
            return [];
        }
    });

    const addToHistory = (item) => {
        setHistory((prev) => {
            const filtered = prev.filter((h) => h.videoId !== item.videoId);
            const updated = [
                { ...item, savedAt: new Date().toISOString() },
                ...filtered,
            ].slice(0, MAX_ITEMS);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    const clearHistory = () => {
        localStorage.removeItem(HISTORY_KEY);
        setHistory([]);
    };

    return { history, addToHistory, clearHistory };
};
