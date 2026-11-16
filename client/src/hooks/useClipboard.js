import { useState } from "react";

/**
 * Provides a copy-to-clipboard utility with 2-second "Copied!" feedback.
 */
export const useClipboard = () => {
    const [copied, setCopied] = useState(false);

    const copy = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // Fallback for older browsers
            const el = document.createElement("textarea");
            el.value = text;
            el.style.position = "fixed";
            el.style.opacity = "0";
            document.body.appendChild(el);
            el.select();
            document.execCommand("copy");
            document.body.removeChild(el);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return { copy, copied };
};
