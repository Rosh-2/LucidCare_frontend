// src/components/SummaryHistorySidebar.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import {
    X,
    FileText,
    Clock,
    CheckSquare,
    Square,
    GitCompare,
    ChevronDown,
    ChevronRight,
    AlertTriangle,
    AlertCircle,
    Loader2,
    RefreshCw,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateLabel(isoString) {
    const d = new Date(isoString);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatTime(isoString) {
    return new Date(isoString).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

/** Extract a human-readable title from the first non-empty line of summary text */
function deriveTitle(text = "") {
    const first = text.split("\n").map((l) => l.trim()).find(Boolean) ?? "Medical Summary";
    // Strip markdown bold/headers
    return first.replace(/^[#*_]+|[#*_]+$/g, "").trim().slice(0, 60) || "Medical Summary";
}

/** Build a short preview snippet */
function derivePreview(text = "") {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const body = lines.slice(1).join(" ");
    return body.slice(0, 120) || lines[0]?.slice(0, 120) || "";
}

/** Group array of summaries — flat list under one group */
function groupByDate(summaries) {
    const groups = {};
    summaries.forEach((s) => {
        const label = s.created_at ? formatDateLabel(s.created_at) : "Unknown Date";
        if (!groups[label]) groups[label] = [];
        groups[label].push(s);
    });
    return groups;
}

// ─── SummaryHistorySidebar ────────────────────────────────────────────────────
export default function SummaryHistorySidebar({ isOpen, onClose, onCompare, onView }) {
    const [summaries, setSummaries] = useState([]);
    const [fetchStatus, setFetchStatus] = useState("idle"); // idle | loading | done | error
    const [selected, setSelected] = useState([]);
    const [collapsed, setCollapsed] = useState({});
    const sidebarRef = useRef(null);

    // ── Fetch summaries from backend ──────────────────────────────────────────
    const loadSummaries = useCallback(async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        setFetchStatus("loading");
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/summaries`, {
                headers: { token },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            
            // Safety: Ensure we always have an array
            const summaryArray = Array.isArray(data) ? data : [];

            // Sort by created_at descending (newest first), falling back to 0 if missing
            summaryArray.sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateB - dateA;
            });

            setSummaries(summaryArray);
            setFetchStatus("done");
        } catch (e) {
            console.error("Failed to fetch summaries:", e);
            setSummaries([]);
            setFetchStatus("error");
        }
    }, []);

    // Fetch when sidebar opens
    useEffect(() => {
        if (isOpen) {
            loadSummaries();
            setSelected([]); // clear selection each open
        }
    }, [isOpen, loadSummaries]);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (isOpen && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
                onClose();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, onClose]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    function toggleSelect(id) {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    }

    function toggleCollapse(label) {
        setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
    }

    function handleCompare() {
        if (!canCompare) return;
        const chosen = selected.map(id => {
            const s = summaries.find(x => x.summary_id === id);
            if (!s) return null;
            return {
                id: s.summary_id,
                title: deriveTitle(s.summary_text),
                date: s.created_at,
                language: s.language,
                preview: derivePreview(s.summary_text),
                fullText: s.summary_text,
            };
        }).filter(Boolean);
        onCompare(chosen);
        onClose();
    }

    function handleView(summary) {
        if (onView) onView(summary.summary_text, summary.xray_image);
        onClose();
    }

    // Identify if selected items are of different types (X-Ray vs PDF Report)
    const safeSummaries = Array.isArray(summaries) ? summaries : [];
    const selectedSummaries = safeSummaries.filter(s => selected.includes(s.summary_id));
    const hasXrayItems = selectedSummaries.some(s => !!s.xray_image);
    const hasPdfItems = selectedSummaries.some(s => !s.xray_image);
    const isTypeMismatch = hasXrayItems && hasPdfItems;
    const canCompare = selected.length >= 2 && !isTypeMismatch;

    // ── Derived data ──────────────────────────────────────────────────────────
    const grouped = groupByDate(safeSummaries);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    }`}
                aria-hidden="true"
            />

            {/* Sidebar Panel */}
            <aside
                ref={sidebarRef}
                className={`fixed top-0 left-0 h-full w-[340px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-teal-500 to-teal-600">
                    <div className="flex items-center gap-2">
                        <Clock size={18} className="text-white/80" />
                        <h2 className="font-bold text-white text-base tracking-tight">
                            Summary History
                        </h2>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={loadSummaries}
                            className="text-white/70 hover:text-white transition rounded-full p-1 hover:bg-white/20"
                            aria-label="Refresh summaries"
                            title="Refresh"
                        >
                            <RefreshCw size={16} className={fetchStatus === "loading" ? "animate-spin" : ""} />
                        </button>
                        <button
                            onClick={onClose}
                            className="text-white/70 hover:text-white transition rounded-full p-1 hover:bg-white/20"
                            aria-label="Close sidebar"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Selection Banner */}
                {selected.length > 0 && (
                    <div className="flex items-center justify-between px-5 py-2.5 bg-teal-50 border-b border-teal-100">
                        <span className="text-xs font-semibold text-teal-700">
                            {selected.length} selected
                        </span>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSelected([])}
                                className="text-xs text-gray-400 hover:text-gray-600 transition"
                            >
                                Clear
                            </button>
                            <button
                                onClick={handleCompare}
                                disabled={!canCompare}
                                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition ${canCompare
                                    ? "bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
                                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                <GitCompare size={13} />
                                Compare
                            </button>
                        </div>
                    </div>
                )}

                {/* Instruction tip */}
                {selected.length === 0 && fetchStatus === "done" && summaries.length > 0 && (
                    <div className="px-5 py-2.5 bg-amber-50 border-b border-amber-100 flex items-start gap-2">
                        <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700 leading-relaxed">
                            Select 2 or more summaries to run a comparative analysis.
                        </p>
                    </div>
                )}

                {/* Mismatch warning */}
                {isTypeMismatch && (
                    <div className="px-5 py-2.5 bg-red-50 border-b border-red-100 flex items-start gap-2">
                        <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-700 leading-relaxed font-medium">
                            Cannot compare an X-Ray with a PDF Report. Please select items of the same type.
                        </p>
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar py-2">

                    {/* Loading */}
                    {fetchStatus === "loading" && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 size={28} className="text-teal-400 animate-spin mb-3" />
                            <p className="text-sm text-gray-400">Loading your summaries…</p>
                        </div>
                    )}

                    {/* Error */}
                    {fetchStatus === "error" && (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                            <p className="text-sm font-semibold text-red-500 mb-2">Failed to load summaries</p>
                            <button
                                onClick={loadSummaries}
                                className="text-xs text-teal-600 hover:underline flex items-center gap-1"
                            >
                                <RefreshCw size={12} /> Try again
                            </button>
                        </div>
                    )}

                    {/* Empty state */}
                    {fetchStatus === "done" && summaries.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <FileText size={26} className="text-gray-300" />
                            </div>
                            <p className="text-sm font-semibold text-gray-500">No summaries yet</p>
                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                Upload a medical report to generate your first summary.
                            </p>
                        </div>
                    )}

                    {/* Grouped summary list */}
                    {fetchStatus === "done" &&
                        Object.entries(grouped).map(([dateLabel, items]) => (
                            <div key={dateLabel} className="mb-1">
                                {/* Date group header */}
                                <button
                                    onClick={() => toggleCollapse(dateLabel)}
                                    className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-widest hover:bg-gray-50 transition"
                                >
                                    <span>{dateLabel}</span>
                                    {collapsed[dateLabel] ? (
                                        <ChevronRight size={13} />
                                    ) : (
                                        <ChevronDown size={13} />
                                    )}
                                </button>

                                {!collapsed[dateLabel] &&
                                    items.map((summary) => {
                                        const isChecked = selected.includes(summary.summary_id);
                                        const title = deriveTitle(summary.summary_text);
                                        const preview = derivePreview(summary.summary_text);

                                        return (
                                            <div
                                                key={summary.summary_id}
                                                onClick={() => handleView(summary)}
                                                className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer transition group border-l-2 ${
                                                    isChecked
                                                        ? "border-teal-400 bg-teal-50/60"
                                                        : "border-transparent hover:bg-gray-50"
                                                }`}
                                            >
                                                {/* Checkbox — click stops propagation so it doesn't trigger view */}
                                                <div
                                                    className="mt-0.5 flex-shrink-0"
                                                    onClick={(e) => { e.stopPropagation(); toggleSelect(summary.summary_id); }}
                                                    title={isChecked ? "Deselect for comparison" : "Select for comparison"}
                                                >
                                                    {isChecked ? (
                                                        <CheckSquare size={17} className="text-teal-500" />
                                                    ) : (
                                                        <Square
                                                            size={17}
                                                            className="text-gray-300 group-hover:text-gray-400 transition"
                                                        />
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <FileText size={13} className="text-gray-400 flex-shrink-0" />
                                                        <p className="text-sm font-semibold text-gray-800 truncate">
                                                            {title}
                                                        </p>
                                                    </div>
                                                    {preview && (
                                                        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                                                            {preview}
                                                        </p>
                                                    )}
                                                    <p className="text-[10px] text-gray-300 mt-1.5">
                                                        {summary.created_at ? formatTime(summary.created_at) : ""}
                                                        {summary.language && summary.language !== "English" && summary.language !== "en" && (
                                                            <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[9px] font-medium uppercase">
                                                                {summary.language}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>

                                                {/* View hint */}
                                                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition mt-0.5">
                                                    <span className="text-[10px] text-teal-500 font-semibold">View →</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        ))}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/80">
                    {fetchStatus === "done" && summaries.length > 0 && (
                        <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                            {summaries.length} report{summaries.length !== 1 ? "s" : ""} in your history
                        </p>
                    )}
                </div>
            </aside>
        </>
    );
}
