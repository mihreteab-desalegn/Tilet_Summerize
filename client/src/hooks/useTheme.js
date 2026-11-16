import { useEffect, useState } from "react";

/**
 * Manages light/dark theme, persisted in localStorage.
 * Automatically respects the user's OS preference on first visit.
 */
export const useTheme = () => {
    const [isDark, setIsDark] = useState(() => {
        const stored = localStorage.getItem("tilet_theme");
        if (stored) return stored === "dark";
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    });

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle("dark", isDark);
        localStorage.setItem("tilet_theme", isDark ? "dark" : "light");
    }, [isDark]);

    return { isDark, toggle: () => setIsDark((d) => !d) };
};
