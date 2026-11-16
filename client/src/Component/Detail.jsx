import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
    Loader2,
    AlertCircle,
    ChevronUp,
    ChevronDown,
    FileType2,
    FileText,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";
import Footer from "./Footer";

const API_URL = import.meta.env.VITE_API_URL || "https://tilet-server.onrender.com";

const removeEmojis = (str) => {
    return str.replace(
        /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uFE0F|\uD83E[\uDD00-\uDDFF])/g,
        ""
    );
};

const STEP_PERCENTAGES = {
    searching: { percent: 20, message: "Searching for video..." },
    transcript: { percent: 45, message: "Fetching video transcript..." },
    fallback: { percent: 45, message: "Analyzing video description..." },
    summarizing: { percent: 70, message: "Generating study notes with AI..." },
    mcqs: { percent: 90, message: "Building interactive quiz..." },
    cached: { percent: 95, message: "Loading from cache..." },
    done: { percent: 100, message: "Ready!" },
};

const Detail = () => {
    const { videoId } = useParams();
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [progressPercent, setProgressPercent] = useState(15);
    const [progressMessage, setProgressMessage] = useState("Connecting to video...");
    const [userAnswers, setUserAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const contentRef = useRef();
    const [showOptions, setShowOptions] = useState(false);

    useEffect(() => {
        let es = null;

        const fallbackFetch = async (targetUrl) => {
            try {
                setProgressPercent(30);
                setProgressMessage("Analyzing video details...");
                const timer = setInterval(() => {
                    setProgressPercent((prev) => (prev < 85 ? prev + 10 : prev));
                }, 800);

                const response = await axios.post(`${API_URL}/api/process`, { url: targetUrl });
                clearInterval(timer);

                if (response.data) {
                    setData({ ...response.data, url: targetUrl });
                    setProgressPercent(100);
                } else {
                    setError("No video data found.");
                }
            } catch (err) {
                setError(
                    err.response?.data?.error || "Failed to fetch video data. Please try again."
                );
            } finally {
                setIsLoading(false);
            }
        };

        const fetchVideoData = () => {
            setIsLoading(true);
            setError("");
            setProgressPercent(15);
            setProgressMessage("Connecting to video...");

            const url = `https://www.youtube.com/watch?v=${videoId}`;

            try {
                const streamUrl = `${API_URL}/api/process/stream?url=${encodeURIComponent(url)}`;
                es = new EventSource(streamUrl);

                es.addEventListener("progress", (e) => {
                    try {
                        const parsed = JSON.parse(e.data);
                        const stepInfo = STEP_PERCENTAGES[parsed.step] || {
                            percent: 50,
                            message: parsed.message || "Processing...",
                        };
                        setProgressPercent(stepInfo.percent);
                        setProgressMessage(stepInfo.message);
                    } catch {
                        // Ignore parse error
                    }
                });

                es.addEventListener("done", (e) => {
                    try {
                        const result = JSON.parse(e.data);
                        setData({ ...result, url });
                        setProgressPercent(100);
                        setProgressMessage("Complete!");
                    } catch {
                        // Ignore parse error
                    } finally {
                        es?.close();
                        setIsLoading(false);
                    }
                });

                es.addEventListener("error", () => {
                    es?.close();
                    fallbackFetch(url);
                });

                es.onerror = () => {
                    es?.close();
                    fallbackFetch(url);
                };
            } catch {
                fallbackFetch(url);
            }
        };

        if (videoId) fetchVideoData();

        return () => {
            if (es) es.close();
        };
    }, [videoId]);

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-white to-blue-100 p-6">
                <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-xl border border-blue-100 space-y-4 text-center">
                    <h2 className="text-xl font-bold text-blue-700">Tilet Summarizer</h2>
                    <div className="flex items-center justify-between text-xs font-semibold text-blue-600 px-1">
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping inline-block" />
                            {progressMessage}
                        </span>
                        <span>{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-blue-100 rounded-full h-3 overflow-hidden shadow-inner">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-500">
                        Generating AI study notes and quiz questions. Please hold on...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex bg-gradient-to-br from-white to-blue-100 items-center justify-center min-h-screen text-red-600 text-lg font-semibold px-4 text-center">
                <AlertCircle className="mr-2 shrink-0" />
                {error}
            </div>
        );
    }

    if (!data) return null;

    const { title, mcqs, summary } = data;

    // Safely parse mcqs (supports Array, JSON string, markdown codeblocks, and wrapper objects)
    const parseQuestions = (raw) => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (typeof raw === "object") {
            for (const key of ["questions", "mcqs", "quiz", "data"]) {
                if (Array.isArray(raw[key])) return raw[key];
            }
            return [];
        }
        if (typeof raw !== "string") return [];

        const cleaned = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
        try {
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed)) return parsed;
            if (parsed && typeof parsed === "object") {
                for (const key of ["questions", "mcqs", "quiz", "data"]) {
                    if (Array.isArray(parsed[key])) return parsed[key];
                }
            }
        } catch {}

        const start = cleaned.indexOf("[");
        const end = cleaned.lastIndexOf("]");
        if (start !== -1 && end > start) {
            try {
                const parsed = JSON.parse(cleaned.slice(start, end + 1));
                if (Array.isArray(parsed)) return parsed;
            } catch {}
        }

        if (start !== -1) {
            const partial = cleaned.slice(start);
            const lastBrace = partial.lastIndexOf("}");
            if (lastBrace !== -1) {
                try {
                    const repaired = partial.slice(0, lastBrace + 1) + "]";
                    const parsed = JSON.parse(repaired);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                } catch {}
            }
        }

        return [];
    };

    const question = parseQuestions(mcqs);

    const handleChange = (questionId, selectedChoice) => {
        setUserAnswers((prev) => ({
            ...prev,
            [questionId]: selectedChoice,
        }));
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        setSubmitted(true);
    };

    const calculateScore = () => {
        let score = 0;
        question.forEach((q) => {
            if (userAnswers[q.id] === q.answer) {
                score++;
            }
        });
        return score;
    };

    const exportAsPDF = () => {
        if (!contentRef.current) return;
        const doc = new jsPDF();
        const elements = contentRef.current.querySelectorAll("*");
        let y = 10;
        const pageHeight = doc.internal.pageSize.height;

        for (const el of elements) {
            let text = removeEmojis(el.innerText?.trim() || "");
            if (!text) continue;

            if (el.tagName === "H1") {
                doc.setFontSize(22);
                doc.setFont(undefined, "bold");
            } else if (el.tagName === "H2") {
                doc.setFontSize(18);
                doc.setFont(undefined, "bold");
            } else {
                doc.setFontSize(14);
                doc.setFont(undefined, "normal");
            }

            const lines = doc.splitTextToSize(text, 180);
            const blockHeight = lines.length * 10;

            if (y + blockHeight > pageHeight - 10) {
                doc.addPage();
                y = 10;
            }

            doc.text(lines, 10, y);
            y += blockHeight + 4;
        }

        doc.save(`${title ? title.slice(0, 30) : "summary"}.pdf`);
    };

    const exportAsDocx = () => {
        if (!contentRef.current) return;
        const elements = contentRef.current.querySelectorAll("*");
        const docChildren = [];

        for (const el of elements) {
            const text = removeEmojis(el.innerText?.trim() || "");
            if (!text) continue;

            let size = 24;
            let bold = false;

            if (el.tagName === "H1") {
                size = 32;
                bold = true;
            } else if (el.tagName === "H2") {
                size = 28;
                bold = true;
            }

            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text,
                            bold,
                            size,
                            font: "Arial",
                        }),
                    ],
                })
            );
        }

        const doc = new Document({
            sections: [
                {
                    children: docChildren,
                },
            ],
        });

        Packer.toBlob(doc).then((blob) => {
            saveAs(blob, `${title ? title.slice(0, 30) : "summary"}.docx`);
        });
    };

    return (
        <div className="bg-gradient-to-br from-white to-blue-100 min-h-screen">
            <div className="h-24 flex items-center px-6 sm:px-20 text-2xl font-bold text-blue-500">
                <a href="/" className="hover:text-blue-600 transition-colors">
                    Tilet Summarizer &amp; Quiz app
                </a>
            </div>

            <div className="flex flex-col md:flex-row gap-5 md:gap-20 px-4 md:px-8">
                {/* Left Column */}
                <div className="w-full md:max-w-xl p-4 md:p-6 text-center space-y-6">
                    <div className="relative flex justify-center items-center mb-4 h-auto min-h-[150px]">
                        <div className="absolute w-[98%] h-full bg-gradient-to-tr from-blue-300 to-blue-700 rounded-3xl -rotate-[7deg] shadow-lg z-0 mt-2" />
                        <iframe
                            src={`https://www.youtube.com/embed/${videoId}`}
                            className="w-full aspect-video rounded-2xl shadow-2xl z-10"
                            title="YouTube video player"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>

                    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md w-full text-left mt-10">
                        {submitted && (
                            <div className="mb-6 p-4 md:p-6 rounded-lg bg-blue-50 border border-blue-300 shadow-lg flex items-center space-x-4 animate-fade-in relative group">
                                <svg
                                    className="w-10 h-10 md:w-12 md:h-12 text-green-600 shrink-0"
                                    viewBox="0 0 52 52"
                                >
                                    <path
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M14 27l7 7 17-17"
                                        className="animate-draw"
                                    />
                                </svg>
                                <div className="text-blue-800 font-semibold text-base md:text-lg">
                                    You got {calculateScore()} out of {question.length} correct!
                                </div>
                            </div>
                        )}

                        {question.length === 0 ? (
                            <p className="text-gray-500 italic">No quiz questions available for this video.</p>
                        ) : (
                            question.map(({ id, question: qText, choices, answer, explanation }) => {
                                const selected = userAnswers[id];
                                const isCorrect = selected === answer;

                                return (
                                    <div
                                        key={id}
                                        className={`mb-6 p-4 rounded border transition-colors ${
                                            submitted
                                                ? isCorrect
                                                    ? "border-green-400 bg-green-50"
                                                    : "border-red-400 bg-red-50"
                                                : "border-gray-300"
                                        }`}
                                    >
                                        <h3 className="text-base md:text-lg font-semibold mb-2">
                                            Q{id}. {qText}
                                        </h3>

                                        {!submitted ? (
                                            <form>
                                                {choices?.map((choice, idx) => (
                                                    <div key={idx} className="mb-1">
                                                        <label className="inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name={`question-${id}`}
                                                                value={choice}
                                                                className="form-radio text-blue-600"
                                                                checked={userAnswers[id] === choice}
                                                                onChange={() => handleChange(id, choice)}
                                                            />
                                                            <span className="ml-2 text-gray-800">{choice}</span>
                                                        </label>
                                                    </div>
                                                ))}
                                            </form>
                                        ) : (
                                            <>
                                                <p>
                                                    <span className="font-medium">Your answer:</span>{" "}
                                                    <span
                                                        className={
                                                            isCorrect ? "text-green-600 font-semibold" : "text-red-600 font-semibold"
                                                        }
                                                    >
                                                        {selected || "No answer selected"}
                                                    </span>
                                                </p>
                                                {!isCorrect && (
                                                    <p>
                                                        <span className="font-medium">Correct answer:</span>{" "}
                                                        <span className="text-green-600 font-semibold">{answer}</span>
                                                    </p>
                                                )}
                                                {explanation && (
                                                    <p className="text-gray-700 mt-2 text-sm bg-white/70 p-2 rounded">
                                                        💡 <strong>Explanation:</strong> {explanation}
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })
                        )}

                        {!submitted && question.length > 0 && (
                            <button
                                onClick={handleSubmit}
                                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 w-full md:w-auto font-medium transition-colors shadow"
                            >
                                Submit
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="w-full md:max-w-2xl p-4 md:p-6">
                    <h2 className="text-xl md:text-2xl font-semibold text-blue-700 mb-4">
                        {title}
                    </h2>
                    <div
                        ref={contentRef}
                        className="prose max-w-none text-gray-800 text-base md:text-lg leading-relaxed"
                    >
                        {summary ? (
                            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{summary}</ReactMarkdown>
                        ) : (
                            <p className="italic text-gray-500">No summary available.</p>
                        )}
                    </div>

                    <div className="relative inline-block text-left w-full mt-8 shadow-xl">
                        <button
                            onClick={() => setShowOptions(!showOptions)}
                            className="bg-blue-500 w-full font-semibold text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center justify-between"
                        >
                            <span>Export Summary</span>
                            <span className="right-2 ml-auto">
                                {showOptions ? <ChevronUp /> : <ChevronDown />}
                            </span>
                        </button>

                        {showOptions && (
                            <div className="absolute mt-2 bg-white border rounded shadow-xl z-10 w-full">
                                <button
                                    onClick={() => {
                                        exportAsPDF();
                                        setShowOptions(false);
                                    }}
                                    className="w-full text-left px-4 py-2 hover:bg-blue-100 flex items-center justify-between"
                                >
                                    <span>Export as PDF</span>
                                    <span className="right-2 ml-auto">
                                        <FileType2 />
                                    </span>
                                </button>
                                <button
                                    onClick={() => {
                                        exportAsDocx();
                                        setShowOptions(false);
                                    }}
                                    className="flex w-full text-left px-4 py-2 hover:bg-blue-100 items-center justify-between"
                                >
                                    <span>Export as DOCX</span>
                                    <span className="right-2 ml-auto">
                                        <FileText />
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Detail;
