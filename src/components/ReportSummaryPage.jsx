// src/pages/ReportSummaryPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkle,
  Menu,
  LogOut,
  User,
  CheckCircle2,
  FileText,
  AlertCircle,
  Upload,
  Image as ImageIcon
} from "lucide-react";
import { Link } from "react-router-dom";

import ReportUploader from "../components/ReportUploader";
import LanguageSelector from "../components/LanguageSelector";
import SummaryGenerator from "../components/SummaryGenerator";

export default function ReportSummaryPage() {
  const [pdfFile, setPdfFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const [language, setLanguage] = useState("en");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleGenerate = async () => {
    if (!pdfFile && !imageFile) {
      return alert("Please upload at least one file (PDF or X-Ray).");
    }
    setLoading(true);

    const formData = new FormData();
    if (pdfFile) formData.append("pdf", pdfFile);
    if (imageFile) formData.append("image", imageFile);
    // You could also pass language if your backend supports translation
    // formData.append("language", language);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setSummary(data.summary);
      } else {
        alert(data.error || "Analysis failed");
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      alert("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-[100svh] font-inter text-gray-800">
      {/* Header */}
      <header className="bg-white shadow-sm py-3 px-6 sm:px-12 flex justify-between items-center sticky top-0 z-50">
        <Link to="/" className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity">
          <Sparkle className="text-teal-500 w-8 h-8" />
          <span className="font-bold text-2xl text-gray-900">LucidCare</span>
        </Link>

        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-3 px-3 py-2 rounded-full hover:bg-gray-100 transition border border-gray-200"
          >
            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">
              <User size={18} />
            </div>
            <Menu size={20} className="text-gray-500" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">User Account</p>
                <p className="text-xs text-gray-500">user@example.com</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="p-4 sm:p-8 lg:px-12 max-w-7xl mx-auto w-full pb-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                <CheckCircle2 size={20} className="text-teal-500" /> New Analysis
              </h2>

              <div className="space-y-8">
                {/* PDF Uploader */}
                <ReportUploader
                  label="Upload Medical PDF"
                  accept=".pdf"
                  icon={Upload}
                  onFileSelect={setPdfFile}
                />

                {/* Image Uploader */}
                <ReportUploader
                  label="Upload X-Ray Image"
                  accept=".jpg,.jpeg,.png"
                  icon={ImageIcon}
                  onFileSelect={setImageFile}
                />

                <LanguageSelector
                  language={language}
                  onLanguageChange={setLanguage}
                />

                <SummaryGenerator
                  loading={loading}
                  onGenerate={handleGenerate}
                />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-8 flex flex-col min-h-[600px]">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden relative">
              {/* Header */}
              <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Sparkle size={18} className="text-teal-500" /> Report Summary
                </h2>
                {summary && (
                  <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                    Ready
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="relative bg-white flex-1">
                {loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-20 backdrop-blur-sm">
                    <div className="w-12 h-12 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin mb-4" />
                    <p className="text-gray-600 font-medium animate-pulse">
                      Analyzing documents...
                    </p>
                  </div>
                )}

                {!loading && !summary && (
                  <div className="h-full flex flex-col items-center justify-center p-10 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                      <FileText size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Report Generated
                    </h3>
                    <p className="max-w-xs mx-auto text-sm text-gray-500 leading-relaxed">
                      Upload a Medical Report (PDF) and/or X-Ray Image on the left to generate a summary.
                    </p>
                  </div>
                )}

                {!loading && summary && (
                  <div className="h-full overflow-y-auto p-8 lg:p-10">
                    <div className="text-gray-700 text-lg leading-8 whitespace-pre-wrap">
                      {summary}
                    </div>

                    <div className="mt-12 pt-6 border-t border-gray-100 flex items-start gap-3">
                      <AlertCircle size={18} className="text-gray-400 mt-0.5" />
                      <p className="text-xs text-gray-400 italic leading-relaxed">
                        Disclaimer: This summary is generated by AI for
                        informational purposes only. Always consult a qualified
                        healthcare professional for medical advice.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
