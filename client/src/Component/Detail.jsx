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

const removeEmojis = (str) => {
    return str.replace(
        /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uFE0F|\uD83E[\uDD00-\uDDFF])/g,
        ""
    );
};

const Detail = () => {
    const { videoId } = useParams();
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [userAnswers, setUserAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const contentRef = useRef();
    const [showOptions, setShowOptions] = useState(false);

    useEffect(() => {
        const fetchVideoData = async () => {
            setIsLoading(true);
            setError("");
            try {
                const url = `https://www.youtube.com/watch?v=${videoId}`;
                const response = await axios.post("https://tilet-server.onrender.com/api/process", {
                    url,
                });
                if (response.data) {
                    setData({ ...response.data, url });
                } else {
                    setError("No video data found.");
                }
            } catch (err) {
                setError("Failed to fetch video data.");
            } finally {
                setIsLoading(false);
            }
        };

        if (videoId) fetchVideoData();
    }, [videoId]);

    if (isLoading) {
        return (
            <div className="flex justify-center bg-gradient-to-br from-white to-blue-100  items-center min-h-screen">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex bg-gradient-to-br from-white to-blue-100  items-center justify-center min-h-screen text-red-600 text-lg font-semibold">
                <AlertCircle className="mr-2" />
                {error}
            </div>
        );
    }

    if (!data) return null;

    const { title, mcqs, summary } = data;

    // ✅ Fix: Safely parse mcqs
    let question = [];
    try {
        question = typeof mcqs === "string" ? JSON.parse(mcqs) : mcqs || [];
    } catch (err) {
        console.error("Invalid MCQ format:", err);
        question = [];
    }

    const handleChange = (questionId, selectedChoice) => {
        setUserAnswers((prev) => ({
            ...prev,
            [questionId]: selectedChoice,
        }));
    };

    const handleSubmit = () => {
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
        const doc = new jsPDF();
        const elements = contentRef.current.querySelectorAll("*");
        let y = 10;
        const pageHeight = doc.internal.pageSize.height;

        for (const el of elements) {
            let text = removeEmojis(el.innerText.trim());
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

        doc.save("export.pdf");
    };

    const exportAsDocx = () => {
        const elements = contentRef.current.querySelectorAll("*");
        const docChildren = [];

        for (const el of elements) {
            const text = removeEmojis(el.innerText.trim());
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
            saveAs(blob, "export.docx");
        });
    };

    return (
        <div className=" bg-gradient-to-br from-white to-blue-100">
            <div className="h-24 flex items-center px-20 text-2xl font-bold text-blue-500">
                <a href="/">
                    Tilet Sumerizer & Quiz app
                </a>

            </div>
            <div className="min-h-screen flex flex-col md:flex-row gap-5 md:gap-20 px-4 md:px-8 ">

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
                                    className="w-10 h-10 md:w-12 md:h-12 text-green-600"
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

                        {question.map(({ id, question, choices, answer, explanation }) => {
                            const selected = userAnswers[id];
                            const isCorrect = selected === answer;

                            return (
                                <div
                                    key={id}
                                    className={`mb-6 p-4 rounded border ${submitted
                                        ? isCorrect
                                            ? "border-green-400 bg-green-50"
                                            : "border-red-400 bg-red-50"
                                        : "border-gray-300"
                                        }`}
                                >
                                    <h3 className="text-base md:text-lg font-semibold mb-2">
                                        Q{id}. {question}
                                    </h3>

                                    {!submitted ? (
                                        <form>
                                            {choices.map((choice, idx) => (
                                                <div key={idx} className="mb-1">
                                                    <label className="inline-flex items-center">
                                                        <input
                                                            type="radio"
                                                            name={`question-${id}`}
                                                            value={choice}
                                                            className="form-radio text-blue-600"
                                                            checked={userAnswers[id] === choice}
                                                            onChange={() => handleChange(id, choice)}
                                                        />
                                                        <span className="ml-2">{choice}</span>
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
                                                        isCorrect ? "text-green-600" : "text-red-600"
                                                    }
                                                >
                                                    {selected || "No answer selected"}
                                                </span>
                                            </p>
                                            {!isCorrect && (
                                                <p>
                                                    <span className="font-medium">Correct answer:</span>{" "}
                                                    <span className="text-green-600">{answer}</span>
                                                </p>
                                            )}
                                            <p className="text-gray-700 mt-2">
                                                💡 <strong>Explanation:</strong> {explanation}
                                            </p>
                                        </>
                                    )}
                                </div>
                            );
                        })}

                        {!submitted && (
                            <button
                                onClick={handleSubmit}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full md:w-auto"
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
                            className="bg-blue-500 w-full font-semibold text-white px-4 py-2 rounded hover:bg-blue-600 flex"
                        >
                            Export Summary
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
                                    className=" w-full text-left px-4 py-2 hover:bg-blue-100 flex"
                                >
                                    Export as PDF
                                    <span className="right-2 ml-auto">
                                        <FileType2 />
                                    </span>
                                </button>
                                <button
                                    onClick={() => {
                                        exportAsDocx();
                                        setShowOptions(false);
                                    }}
                                    className="flex w-full text-left px-4 py-2 hover:bg-blue-100"
                                >
                                    Export as DOCX
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
