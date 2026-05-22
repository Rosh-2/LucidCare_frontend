// src/components/ComparativeAnalysisPanel.jsx
import { useState } from "react";
import {
    GitCompare,
    TrendingDown,
    TrendingUp,
    Minus,
    AlertCircle,
    X,
    ChevronDown,
    ChevronUp,
    Loader2,
    CheckCircle2,
    Clock,
} from "lucide-react";

// ─── Utility ─────────────────────────────────────────────────────────────────
function formatDate(isoString) {
    const d = new Date(isoString);
    const diffDays = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Real API call ────────────────────────────────────────────────────────────
async function callCompareAPI(summaries, language) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${import.meta.env.VITE_API_URL}/compare`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            token,
        },
        body: JSON.stringify({
            summaries: summaries.map((s) => ({ id: s.id, fullText: s.fullText })),
            language: language,
        }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function ChangeIcon({ change }) {
    if (change === "deteriorated")
        return <TrendingDown size={16} className="text-red-500" />;
    if (change === "improved")
        return <TrendingUp size={16} className="text-green-500" />;
    return <Minus size={16} className="text-gray-400" />;
}

function ChangeChip({ change }) {
    const map = {
        deteriorated: "bg-red-100 text-red-600",
        improved: "bg-green-100 text-green-600",
        stable: "bg-gray-100 text-gray-500",
    };
    return (
        <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${map[change]}`}
        >
            {change}
        </span>
    );
}

function VerdictBanner({ verdict, confidence }) {
    const cfg = {
        deteriorated: {
            bg: "bg-red-50",
            border: "border-red-200",
            icon: <TrendingDown size={28} className="text-red-500" />,
            title: "Condition Deteriorated",
            sub: "Health metrics show significant decline compared to the earlier report.",
            badge: "bg-red-500",
        },
        improved: {
            bg: "bg-green-50",
            border: "border-green-200",
            icon: <TrendingUp size={28} className="text-green-500" />,
            title: "Condition Improved",
            sub: "Health metrics show positive improvement compared to the earlier report.",
            badge: "bg-green-500",
        },
        normal: {
            bg: "bg-teal-50",
            border: "border-teal-200",
            icon: <CheckCircle2 size={28} className="text-teal-500" />,
            title: "Condition Stable",
            sub: "No significant changes detected between the selected reports.",
            badge: "bg-teal-500",
        },
    };
    const c = cfg[verdict] ?? cfg.normal;

    return (
        <div className={`rounded-xl border p-5 flex items-center gap-4 ${c.bg} ${c.border}`}>
            <div>{c.icon}</div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-base">{c.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{c.sub}</p>
            </div>
            <div className={`text-white text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap ${c.badge}`}>
                {confidence}% confidence
            </div>
        </div>
    );
}

function SummaryCard({ summary, index }) {
    const [expanded, setExpanded] = useState(false);
    const labels = ["Baseline Report (First Selected)", "Comparison Target (Second Selected)", "Report 3", "Report 4"];

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
                onClick={() => setExpanded((p) => !p)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition text-left"
            >
                <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {index + 1}
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">{summary.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock size={11} className="text-gray-400" />
                            <p className="text-[11px] text-gray-400">{formatDate(summary.date)}</p>
                        </div>
                    </div>
                </div>
                <span className="text-xs text-gray-400 mr-1">{labels[index] ?? `Report ${index + 1}`}</span>
                {expanded ? (
                    <ChevronUp size={15} className="text-gray-400 flex-shrink-0" />
                ) : (
                    <ChevronDown size={15} className="text-gray-400 flex-shrink-0" />
                )}
            </button>
            {expanded && (
                <div className="px-5 py-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 bg-white">
                    {summary.fullText || summary.preview}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ComparativeAnalysisPanel({ summaries, onClose }) {
    const [analysisResult, setAnalysisResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [language, setLanguage] = useState("en");

    async function handleAnalyze() {
        setLoading(true);
        setError(null);
        setAnalysisResult(null);
        try {
            const targetLangStr = language === "ml" ? "Malayalam" : "English";
            const result = await callCompareAPI(summaries, targetLangStr);
            setAnalysisResult(result);
        } catch (e) {
            setError(e.message || "Failed to run analysis. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    // Use the exact order provided by the user's selection sequence
    const sorted = summaries;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden h-full">
            {/* Panel Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-teal-500 to-teal-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <GitCompare size={18} className="text-white/80" />
                    <h2 className="font-bold text-white text-base">Comparative Analysis</h2>
                    <span className="ml-2 bg-white/20 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {summaries.length} reports
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="text-white/70 hover:text-white transition rounded-full p-1 hover:bg-white/20"
                    aria-label="Close comparative analysis"
                >
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                {/* Selected Summaries */}
                <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                        Selected Reports
                    </h3>
                    <div className="space-y-2">
                        {sorted.map((s, i) => (
                            <SummaryCard key={s.id} summary={s} index={i} />
                        ))}
                    </div>
                </div>

                {/* Analyze Controls */}
                {!analysisResult && (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">Output Language:</span>
                            <div className="relative flex-1">
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                                >
                                    <option value="en">English</option>
                                    <option value="ml">Malayalam</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                    <ChevronDown size={14} />
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleAnalyze}
                            disabled={loading}
                            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition shadow-sm ${loading
                                ? "bg-teal-400 text-white cursor-not-allowed"
                                : "bg-teal-600 hover:bg-teal-700 text-white"
                                }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={17} className="animate-spin" />
                                    Analyzing with AI...
                                </>
                            ) : (
                                <>
                                    <GitCompare size={17} />
                                    Run Comparative Analysis
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl border border-red-200">
                        <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                )}

                {/* Analysis Results */}
                {analysisResult && (
                    <div className="space-y-5 animate-fade-in">
                        {/* Verdict Banner */}
                        <VerdictBanner
                            verdict={analysisResult.verdict}
                            confidence={analysisResult.confidence}
                        />

                        {/* AI Summary */}
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                                AI Analysis Summary
                            </h3>
                            <p className="text-sm text-gray-700 leading-relaxed">
                                {analysisResult.summary}
                            </p>
                        </div>

                        {/* Metric Highlights */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                                Key Metric Changes
                            </h3>
                            <div className="space-y-2">
                                {analysisResult.highlights.map((h, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm"
                                    >
                                        <ChangeIcon change={h.change} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="text-sm font-semibold text-gray-800">
                                                    {h.metric}
                                                </p>
                                                <ChangeChip change={h.change} />
                                            </div>
                                            <p className="text-xs text-gray-400 truncate">{h.note}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-xs text-gray-400 line-through">
                                                {h.oldValue}
                                            </p>
                                            <p className="text-sm font-bold text-gray-800">{h.newValue}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recommendation */}
                        <div className="bg-amber-50 rounded-xl p-5 border border-amber-200 flex items-start gap-3">
                            <AlertCircle size={17} className="text-amber-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
                                    Recommendation
                                </p>
                                <p className="text-sm text-amber-800 leading-relaxed">
                                    {analysisResult.recommendation}
                                </p>
                            </div>
                        </div>

                        {/* Re-run */}
                        <button
                            onClick={handleAnalyze}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm text-teal-600 border border-teal-200 hover:bg-teal-50 transition font-semibold"
                        >
                            <GitCompare size={15} />
                            Re-run Analysis
                        </button>

                        {/* Disclaimer */}
                        <div className="flex items-start gap-2 pt-1">
                            <AlertCircle size={13} className="text-gray-300 mt-0.5 flex-shrink-0" />
                            <p className="text-[10px] text-gray-300 italic leading-relaxed">
                                This AI-generated analysis is for informational purposes only. Always consult a qualified healthcare professional for medical advice.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
