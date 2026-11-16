const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Calls the OpenRouter chat completions API.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {number} [temperature=0.3]
 * @returns {Promise<string>}
 */
const callOpenRouter = async (systemPrompt, userPrompt, temperature = 0.3) => {
    const API_KEY = process.env.OPENROUTER_API_KEY;
    if (!API_KEY || API_KEY === "your_openrouter_api_key_here") {
        const err = new Error("OPENROUTER_API_KEY is missing. Please set your key in backend/.env");
        err.status = 500;
        throw err;
    }
    const MODEL = process.env.OPENROUTER_MODEL || "openrouter/auto";

    const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
            model: MODEL,
            temperature,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API Error: ${response.status} — ${errorText}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || "";
};

/**
 * Summarises video transcript or description for students using original prompt.
 * @param {string} text - Transcript or description text
 * @returns {Promise<string>} Markdown-formatted summary
 */
export const summarizeText = async (text) => {
    return callOpenRouter(
        "You are an expert educational content creator. Summarize video transcripts for students in an engaging, study-friendly format.",
        `Summarize the following video content for students. ALWAYS write in English regardless of the language of the input.

Summarize the following video transcript or description for students using a friendly tone, clear subtopic headings with emojis, bullet points for key ideas, interactive prompts (like Tip or facts), and include a title, short intro, main content sections, a quick recap, examples that interact with real life, and a conclusion to make it engaging and study-friendly. Before each subtopic add one blank line, and provide detailed explanations with a few emojis. Use different font sizes depending on the situation, bullet points, numbers, and indentation for interactive structure.

Content to summarize: \n\n${text}`
    );
};

/**
 * Generates multiple-choice quiz questions from a summary using original prompt.
 * @param {string} summary - Markdown summary text
 * @returns {Promise<string>} JSON string array of question objects
 */
export const generateMcqs = async (summary) => {
    const rawText = await callOpenRouter(
        "You are an expert quiz creator. You only respond with valid JSON arrays, no markdown, no commentary. ALL questions and answers MUST be in English only.",
        `Based on the following educational summary, generate 20 multiple-choice questions in JSON format. Each question should include:

- id (string or number)
- question (string)
- choices (array of 4 strings)
- answer (string)
- explanation (string explaining why the correct answer is right and others are wrong)

Respond ONLY with a JSON array of 15 questions. No extra text or formatting.

Summary:\n\n${summary}`,
        0.3
    );

    // Clean up code blocks if present
    const cleaned = rawText.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();

    return cleaned;
};
