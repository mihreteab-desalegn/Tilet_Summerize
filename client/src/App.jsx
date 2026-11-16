import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Home from "./Component/Home";
import Detail from "./Component/Detail";

function App() {
  return (
    <Router>
      <Helmet>
        <title>Tilet | YouTube Video Summarizer &amp; Quiz Generator</title>
        <meta
          name="description"
          content="Tilet transforms YouTube videos into concise AI-powered summaries and interactive quizzes. Study smarter — paste a URL and learn in seconds."
        />
        <meta name="keywords" content="Tilet, YouTube summary, quiz generator, AI learning, video notes" />
        <meta name="robots" content="index, follow" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Tilet" />
        <meta property="og:title" content="Tilet | YouTube Video Summarizer &amp; Quiz Generator" />
        <meta property="og:description" content="Transform YouTube videos into study notes and quizzes with AI." />
        <meta property="og:image" content="https://tilet-summerize.onrender.com/video.jpg" />
        <meta property="og:url" content="https://tilet-summerize.onrender.com" />
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
