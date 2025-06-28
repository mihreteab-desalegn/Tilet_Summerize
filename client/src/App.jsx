import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Helmet } from "react-helmet";
import Home from "./Component/Home";
import Detail from "./Component/Detail";

function App() {
  return (
    <Router>
      {/* Global SEO defaults */}
      <Helmet>
        <title>Tilet | YouTube Video Summarizer & Quiz Generator</title>
        <meta
          name="description"
          content="Tilet is a cutting-edge AI-powered platform designed to revolutionize the way you learn from YouTube videos. Instantly generate concise, easy-to-understand summaries and create interactive quizzes tailored to the video content, helping students, educators, and knowledge seekers save time, improve comprehension, and retain information more effectively. Whether you're studying for exams, preparing lessons, or simply curious, Tilet transforms lengthy video content into digestible learning tools, boosting productivity and engagement for learners of all levels."
        />
        <meta name="keywords" content="Tilet, YouTube summary, quiz generator, video learning" />
        <meta name="author" content="Tilet" />
        <meta name="robots" content="index, follow" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Tilet" />
        <meta
          property="og:title"
          content="Tilet | YouTube Video Summarizer & Quiz Generator"
        />
        <meta
          property="og:description"
          content="Tilet is a cutting-edge AI-powered platform designed to revolutionize the way you learn from YouTube videos. Instantly generate concise, easy-to-understand summaries and create interactive quizzes tailored to the video content, helping students, educators, and knowledge seekers save time, improve comprehension, and retain information more effectively. Whether you're studying for exams, preparing lessons, or simply curious, Tilet transforms lengthy video content into digestible learning tools, boosting productivity and engagement for learners of all levels."
        />
        <meta property="og:image" content="./video.jpg" />
        <meta property="og:url" content="https://tilet-summerize.onrender.com" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/detail/:videoId" element={<Detail />} />
      </Routes>
    </Router>
  );
}

export default App;
