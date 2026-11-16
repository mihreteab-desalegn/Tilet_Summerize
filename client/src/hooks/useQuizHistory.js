import { useState } from "react";

const QUIZ_KEY = "tilet_quiz_history";

/**
 * Tracks quiz attempt history per video, persisted in localStorage.
 * @param {string} videoId
 */
export const useQuizHistory = (videoId) => {
    const [quizHistory, setQuizHistory] = useState(() => {
        try {
            const all = JSON.parse(localStorage.getItem(QUIZ_KEY)) || {};
            return all[videoId] || [];
        } catch {
            return [];
        }
    });

    const saveResult = (score, total) => {
        const all = (() => {
            try { return JSON.parse(localStorage.getItem(QUIZ_KEY)) || {}; } catch { return {}; }
        })();

        const entry = { score, total, date: new Date().toISOString() };
        const updated = {
            ...all,
            [videoId]: [entry, ...(all[videoId] || [])].slice(0, 20),
        };
        localStorage.setItem(QUIZ_KEY, JSON.stringify(updated));
        setQuizHistory(updated[videoId]);
    };

    const bestScore = quizHistory.length > 0
        ? Math.max(...quizHistory.map((r) => r.score))
        : null;

    return { quizHistory, saveResult, bestScore, attemptCount: quizHistory.length };
};
