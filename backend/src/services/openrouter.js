const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Calls the OpenRouter chat completions API.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {number} [temperature=0.3]
 * @param {number} [maxTokens=2500]
 * @returns {Promise<string>}
 */
const callOpenRouter = async (systemPrompt, userPrompt, temperature = 0.3, maxTokens = 2500) => {
    const API_KEY = process.env.OPENROUTER_API_KEY;
    if (!API_KEY || API_KEY === "your_openrouter_api_key_here") {
        const err = new Error("OPENROUTER_API_KEY is missing. Please set your key in backend/.env or Render dashboard.");
        err.status = 500;
        throw err;
    }
    const MODEL = process.env.OPENROUTER_MODEL || "openrouter/auto";

    const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
            "HTTP-Referer": "https://tilet-summerize.onrender.com",
            "X-Title": "Tilet Summarizer",
        },
        body: JSON.stringify({
            model: MODEL,
            temperature,
            max_tokens: maxTokens,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        let parsedMessage = errorText;
        try {
            const parsed = JSON.parse(errorText);
            if (parsed.error?.message) {
                parsedMessage = parsed.error.message;
            }
        } catch {
            // keep raw errorText
        }
        const err = new Error(`OpenRouter API Error (${response.status}): ${parsedMessage}`);
        err.status = response.status >= 500 ? 502 : response.status;
        throw err;
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || "";
};

/**
 * Safely parses and extracts a JSON array of MCQ objects from raw LLM text.
 * Handles code blocks, objects with wrapper keys, and truncated JSON arrays.
 * @param {string|any} text
 * @returns {Array} Array of question objects
 */
export const extractJsonArray = (text) => {
    if (!text) return [];
    if (Array.isArray(text)) return text;
    if (typeof text === "object") {
        for (const key of ["questions", "mcqs", "quiz", "data"]) {
            if (Array.isArray(text[key])) return text[key];
        }
        return [];
    }
    if (typeof text !== "string") return [];

    // Strip markdown code fences if present
    const cleaned = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

    // 1. Try direct parse
    try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === "object") {
            for (const key of ["questions", "mcqs", "quiz", "data"]) {
                if (Array.isArray(parsed[key])) return parsed[key];
            }
        }
    } catch {
        // Fall through to substring extraction
    }

    // 2. Extract between first '[' and last ']'
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start !== -1 && end > start) {
        try {
            const parsed = JSON.parse(cleaned.slice(start, end + 1));
            if (Array.isArray(parsed)) return parsed;
        } catch {
            // Fall through to truncated repair
        }
    }

    // 3. Repair partially truncated JSON array (if max_tokens cut it off)
    if (start !== -1) {
        const partial = cleaned.slice(start);
        const lastBrace = partial.lastIndexOf("}");
        if (lastBrace !== -1) {
            try {
                const repaired = partial.slice(0, lastBrace + 1) + "]";
                const parsed = JSON.parse(repaired);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch {
                // Ignore repair failure
            }
        }
    }

    return [];
};

/**
 * Summarises video transcript or description for students using original prompt.
 * @param {string} text - Transcript or description text
 * @returns {Promise<string>} Markdown-formatted summary
 */
export const summarizeText = async (text) => {
    // Truncate to safe length (15,000 chars) to prevent exceeding prompt token limits on multi-byte scripts
    const safeText = text && text.length > 15000 ? text.slice(0, 15000) + "\n\n[Transcript truncated for length]" : text;

    return callOpenRouter(
        "You are an expert educational content creator. Summarize video transcripts for students in an engaging, study-friendly format.",
        `Summarize the following video content for students. ALWAYS write in English regardless of the language of the input.

Summarize the following video transcript or description for students using a friendly tone, clear subtopic headings with emojis, bullet points for key ideas, interactive prompts (like Tip or facts), and include a title, short intro, main content sections, a quick recap, examples that interact with real life, and a conclusion to make it engaging and study-friendly. Before each subtopic add one blank line, and provide detailed explanations with a few emojis. Use different font sizes depending on the situation, bullet points, numbers, and indentation for interactive structure.

Content to summarize: \n\n${safeText}`,
        0.3,
        2500
    );
};

/**
 * Generates multiple-choice quiz questions from a summary using original prompt.
 * @param {string} summary - Markdown summary text
 * @returns {Promise<Array>} Array of question objects
 */
export const generateMcqs = async (summary) => {
    if (!summary || typeof summary !== "string" || summary.trim().length === 0) {
        return [];
    }

    const safeSummary = summary.length > 8000 ? summary.slice(0, 8000) : summary;

    try {
        const rawText = await callOpenRouter(
            "You are an expert quiz creator. You only respond with a valid JSON array of question objects, with no markdown code fences and no commentary. All questions and answers must be in English only.",
            `Based on the following educational summary, generate 10 multiple-choice questions in JSON format. Each question should include:

- id (number 1 to 10)
- question (string)
- choices (array of 4 distinct strings)
- answer (string, exactly matching one of the choices)
- explanation (string explaining why the correct answer is right and others are wrong)

Respond ONLY with a JSON array of 10 questions.

Summary:
${safeSummary}`,
            0.3,
            2500
        );

        return extractJsonArray(rawText);
    } catch (err) {
        console.warn("generateMcqs error:", err.message);
        return [];
    }
};
