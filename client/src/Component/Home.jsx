import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { AlertCircle } from "lucide-react";
import Footer from "./Footer";

const API_URL = import.meta.env.VITE_API_URL || "https://tilet-server.onrender.com";

const extractVideoId = (inputUrl) => {
    try {
        const parsedUrl = new URL(inputUrl);
        if (parsedUrl.hostname.includes("youtube.com")) {
            return parsedUrl.searchParams.get("v");
        } else if (parsedUrl.hostname.includes("youtu.be")) {
            return parsedUrl.pathname.split("/")[1]?.split("?")[0];
        } else if (parsedUrl.pathname.includes("/embed/")) {
            return parsedUrl.pathname.split("/embed/")[1]?.split("?")[0];
        } else if (parsedUrl.pathname.includes("/shorts/")) {
            return parsedUrl.pathname.split("/shorts/")[1]?.split("?")[0];
        }
    } catch {
        const match = inputUrl.match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];
    }
    return "";
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

const Home = () => {
    const [url, setUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [title, setTitle] = useState("");
    const [thumbnail, setThumbnail] = useState("");
    const [duration, setDuration] = useState("");
    const [videoId, setVideoId] = useState("");
    const [progressPercent, setProgressPercent] = useState(0);
    const [progressMessage, setProgressMessage] = useState("");
    const eventSourceRef = useRef(null);

    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const handleGetInfo = () => {
        if (!url.trim()) return;

        const id = extractVideoId(url);
        if (!id) {
            setError("Please enter a valid YouTube video URL.");
            return;
        }

        setIsLoading(true);
        setError("");
        setTitle("");
        setThumbnail("");
        setDuration("");
        setVideoId(id);
        setProgressPercent(15);
        setProgressMessage("Connecting to video...");

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        try {
            const streamUrl = `${API_URL}/api/process/stream?url=${encodeURIComponent(url)}`;
            const es = new EventSource(streamUrl);
            eventSourceRef.current = es;

            es.addEventListener("progress", (e) => {
                try {
                    const data = JSON.parse(e.data);
                    const stepInfo = STEP_PERCENTAGES[data.step] || {
                        percent: 50,
                        message: data.message || "Processing...",
                    };
                    setProgressPercent(stepInfo.percent);
                    setProgressMessage(stepInfo.message);
                } catch {
                    // Ignore parse error
                }
            });

            es.addEventListener("done", (e) => {
                try {
                    const data = JSON.parse(e.data);
                    setTitle(data.title || "");
                    setThumbnail(data.thumbnail || "");
                    setDuration(data.duration || "");
                    setProgressPercent(100);
                    setProgressMessage("Complete!");
                } catch {
                    // Ignore parse error
                } finally {
                    es.close();
                    setIsLoading(false);
                }
            });

            es.addEventListener("error", (e) => {
                es.close();
                // Fallback to standard axios POST if SSE encounters an error
                fallbackFetch();
            });

            es.onerror = () => {
                es.close();
                fallbackFetch();
            };
        } catch {
            fallbackFetch();
        }
    };

    const fallbackFetch = async () => {
        try {
            setProgressPercent(30);
            setProgressMessage("Analyzing video details...");

            const timer = setInterval(() => {
                setProgressPercent((prev) => (prev < 85 ? prev + 10 : prev));
            }, 800);

            const response = await axios.post(`${API_URL}/api/process`, { url });
            clearInterval(timer);

            if (response.data) {
                setTitle(response.data.title || "");
                setThumbnail(response.data.thumbnail || "");
                setDuration(response.data.duration || "");
                setProgressPercent(100);
                setProgressMessage("Complete!");
            } else {
                setError("No data returned.");
            }
        } catch (err) {
            setError(
                "Failed to fetch video info. Please try again." +
                (err.response?.data?.error ? `: ${err.response.data.error}` : "")
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-white to-blue-100 flex items-center justify-center p-4">
                <div className="w-full max-w-xl p-6 text-center space-y-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-blue-700">YouTube Summarizer & Quiz App</h1>

                    <div className="flex items-center gap-2">
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => {
                                const input = e.target.value;
                                setUrl(input);
                                setVideoId(extractVideoId(input) || "");
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleGetInfo();
                            }}
                            aria-label="YouTube video URL"
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="flex-1 h-12 px-4 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleGetInfo}
                            disabled={isLoading || !url}
                            aria-label="Get Video Information"
                            className="h-12 px-5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium shadow"
                        >
                            {isLoading ? "Processing..." : "Get Info"}
                        </button>
                    </div>

                    {error && (
                        <div className="flex items-center bg-red-100 border border-red-300 text-red-600 px-4 py-2 rounded-md text-left">
                            <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Progress Bar instead of plain spinner */}
                    {isLoading && (
                        <div className="w-full max-w-lg mx-auto mt-6 bg-white/95 p-4 rounded-xl shadow-md border border-blue-200 space-y-3">
                            <div className="flex items-center justify-between text-xs font-semibold text-blue-700">
                                <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping inline-block" />
                                    {progressMessage || "Processing video..."}
                                </span>
                                <span>{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-blue-100 rounded-full h-3 overflow-hidden shadow-inner">
                                <div
                                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {!isLoading && title && (
                        <>
                            <div className="mb-6">
                                <h2 className="text-2xl font-semibold text-blue-700 mb-10">{title}</h2>

                                <div className="relative flex justify-center items-center mb-4 h-auto min-h-[150px]">
                                    <div className="absolute w-[98%] h-full bg-gradient-to-tr from-blue-300 to-blue-700 rounded-3xl -rotate-[7deg] shadow-lg z-0 mt-2" />

                                    <img
                                        src={thumbnail}
                                        alt="Video Thumbnail"
                                        className="w-full max-w-lg rounded-2xl shadow-2xl z-10"
                                    />

                                    {duration && (
                                        <span className="absolute bottom-2 right-4 bg-blue-700 text-white text-sm px-2 py-1 rounded-full z-20">
                                            {duration}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-center gap-10 pt-4">
                                <a
                                    href={`/detail/${videoId}`}
                                    rel="noopener noreferrer"
                                    className="bg-blue-500 text-white px-7 font-semibold py-2 rounded-lg hover:bg-transparent hover:text-blue-500 hover:border-2 hover:border-blue-500 transition-all duration-300 shadow"
                                >
                                    Study Video
                                </a>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Decorative Ethiopian Tibeb patterns */}
            <div className="fixed -bottom-28 -right-[500px] w-full h-[180px] overflow-hidden -rotate-[45deg] pointer-events-none">
                <svg width="100%" height="180" viewBox="0 0 600 180" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="blueGradientBottom" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#1e3a8a" />
                        </linearGradient>
                        <pattern id="binanceTibebBottom" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                            <g fill="url(#blueGradientBottom)" stroke="white" strokeWidth="1">
                                <polygon points="30,10 50,30 30,50 10,30" />
                                <polygon points="30,0 36,6 30,12 24,6" />
                                <polygon points="60,30 54,36 48,30 54,24" />
                                <polygon points="30,60 24,54 30,48 36,54" />
                                <polygon points="0,30 6,24 12,30 6,36" />
                            </g>
                        </pattern>
                    </defs>
                    <rect y="0" width="100%" height="60" fill="url(#binanceTibebBottom)" />
                    <rect y="60" width="100%" height="60" fill="url(#binanceTibebBottom)" />
                    <rect y="120" width="100%" height="60" fill="url(#binanceTibebBottom)" />
                </svg>
            </div>

            <div className="fixed -top-28 -left-[500px] w-full h-[180px] overflow-hidden -rotate-[45deg] pointer-events-none">
                <svg width="100%" height="180" viewBox="0 0 600 180" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="blueGradientTop" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#1e3a8a" />
                        </linearGradient>
                        <pattern id="binanceTibebTop" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                            <g fill="url(#blueGradientTop)" stroke="white" strokeWidth="1">
                                <polygon points="30,10 50,30 30,50 10,30" />
                                <polygon points="30,0 36,6 30,12 24,6" />
                                <polygon points="60,30 54,36 48,30 54,24" />
                                <polygon points="30,60 24,54 30,48 36,54" />
                                <polygon points="0,30 6,24 12,30 6,36" />
                            </g>
                        </pattern>
                    </defs>
                    <rect y="0" width="100%" height="60" fill="url(#binanceTibebTop)" />
                    <rect y="60" width="100%" height="60" fill="url(#binanceTibebTop)" />
                    <rect y="120" width="100%" height="60" fill="url(#binanceTibebTop)" />
                </svg>
            </div>
        </>
    );
};

export default Home;
