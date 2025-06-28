import { useState } from "react";
import axios from "axios";
import { Search, Loader2, AlertCircle } from "lucide-react";
import Footer from "./Footer";

const Home = () => {
    const [url, setUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [title, setTitle] = useState("");
    const [thumbnail, setThumbnail] = useState("");
    const [duration, setDuration] = useState("");
    const [videoId, setVideoId] = useState("");

    const handleGetInfo = async () => {
        setIsLoading(true);
        setError("");
        setTitle("");
        setThumbnail("");
        setDuration("");

        try {
            const response = await axios.post("https://tilet-server.onrender.com/api/process", { url });

            if (response.data) {
                setTitle(response.data.title || "");
                setThumbnail(response.data.thumbnail || "");
                setDuration(response.data.duration || "");
            } else {
                setError("No data returned.");
            }
        } catch (err) {
            setError(
                "Failed to fetch video info. Please try again." +
                (err.response ? `: ${err.response.data.error || err.response.data}` : "")
            );
        } finally {
            setIsLoading(false);
        }
    };

    const extractVideoId = (url) => {
        try {
            const parsedUrl = new URL(url);
            let id = null;

            if (parsedUrl.hostname.includes("youtube.com")) {
                id = parsedUrl.searchParams.get("v");
            } else if (parsedUrl.hostname.includes("youtu.be")) {
                id = parsedUrl.pathname.split("/")[1];
            } else if (parsedUrl.pathname.includes("/embed/")) {
                id = parsedUrl.pathname.split("/embed/")[1];
            }

            setVideoId(id || "");
        } catch {
            setVideoId("");
        }
    };

    console.log("Video ID:", videoId);

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
                                extractVideoId(input);
                            }}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="flex-1 h-12 px-4 border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 "
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleGetInfo}
                            disabled={isLoading || !url}
                            className="h-12 px-5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 "
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Get Info"}
                        </button>
                    </div>

                    {error && (
                        <div className="flex items-center bg-red-100 border border-red-300 text-red-600 px-4 py-2 rounded-md">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            {error}
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex justify-center items-center mt-10">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
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
                                    className="bg-blue-500 text-white px-7 font-semibold py-2 rounded-lg hover:bg-transparent hover:text-blue-500 hover:border-2 hover:border-blue-500 transition-all duration-300"
                                >
                                    Study Video
                                </a>

                            </div>
                        </>
                    )}
                </div>

            </div>



            <div className="fixed -bottom-28 -right-[500px] w-full h-[180px] overflow-hidden -rotate-[45deg]">
                <svg width="100%" height="180" viewBox="0 0 600 180" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="blueGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#1e3a8a" />
                        </linearGradient>
                        <pattern id="binanceTibeb" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                            <g fill="url(#blueGradient)" stroke="white" strokeWidth="1">
                                <polygon points="30,10 50,30 30,50 10,30" />
                                <polygon points="30,0 36,6 30,12 24,6" />
                                <polygon points="60,30 54,36 48,30 54,24" />
                                <polygon points="30,60 24,54 30,48 36,54" />
                                <polygon points="0,30 6,24 12,30 6,36" />
                            </g>
                        </pattern>
                    </defs>
                    <rect y="0" width="100%" height="60" fill="url(#binanceTibeb)" />
                    <rect y="60" width="100%" height="60" fill="url(#binanceTibeb)" />
                    <rect y="120" width="100%" height="60" fill="url(#binanceTibeb)" />
                </svg>
            </div>

            <div className="fixed -top-28 -left-[500px] w-full h-[180px] overflow-hidden -rotate-[45deg]">
                <svg width="100%" height="180" viewBox="0 0 600 180" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="blueGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#1e3a8a" />
                        </linearGradient>
                        <pattern id="binanceTibeb" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                            <g fill="url(#blueGradient)" stroke="white" strokeWidth="1">
                                <polygon points="30,10 50,30 30,50 10,30" />
                                <polygon points="30,0 36,6 30,12 24,6" />
                                <polygon points="60,30 54,36 48,30 54,24" />
                                <polygon points="30,60 24,54 30,48 36,54" />
                                <polygon points="0,30 6,24 12,30 6,36" />
                            </g>
                        </pattern>
                    </defs>
                    <rect y="0" width="100%" height="60" fill="url(#binanceTibeb)" />
                    <rect y="60" width="100%" height="60" fill="url(#binanceTibeb)" />
                    <rect y="120" width="100%" height="60" fill="url(#binanceTibeb)" />
                </svg>
            </div>

        </>
    );
};

export default Home;
