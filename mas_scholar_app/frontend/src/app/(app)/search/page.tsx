"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, ChevronRight, ShieldCheck, Clock, CheckCircle2, CircleDashed, AlertTriangle, Brain } from "lucide-react";
import Link from "next/link";
import { v4 as uuidv4 } from 'uuid';
import { MOCK_SCHOLARSHIPS } from "@/lib/mockData";
import { SearchSkeletonList } from "@/components/Skeletons";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Strict Stages for the Rail
const STAGES = ["START", "EMBEDDING", "VECTOR_SEARCH", "RRF_FUSION", "COMPLETE"];
const STAGE_LABELS: Record<string, string> = {
    START: "Initializing",
    EMBEDDING: "Vectorizing",
    VECTOR_SEARCH: "Retrieving",
    RRF_FUSION: "Ranking",
    COMPLETE: "Ready"
};

interface Scholarship {
    id: string;
    name: string;
    provider: string;
    amount: number;
    match_score: number;
    eligibility_status: string;
    verified?: boolean;
    category?: string[];
    deadline_info?: { display_text: string; days_remaining: number; urgency_level: string };
    scam_indicators?: string[];
    is_web_result?: boolean;
    application_link?: string;
    source_snippet?: string;
}

function getSavedProfile() {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem("mas_scholar_profile");
    return saved ? JSON.parse(saved) : null;
}

export default function SearchPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialQuery = searchParams.get("q") || "";

    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<Scholarship[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentStage, setCurrentStage] = useState("START");
    const [latency, setLatency] = useState(0);
    const [memoryActive, setMemoryActive] = useState(false);

    // Real WebSocket connection for stage updates
    useEffect(() => {
        if (!isLoading) {
            return;
        }

        const searchId = searchParams.get("search_id");
        if (!searchId) return;

        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"}/ws/agent?search_id=${searchId}`;
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.stage && STAGES.includes(data.stage)) {
                    setCurrentStage(data.stage);
                }
            } catch (e) {
                console.warn("WS parse error", e);
            }
        };

        ws.onerror = () => {
            console.warn("WebSocket unavailable, using fallback progression");
        };

        return () => {
            ws.close();
        };
    }, [isLoading, searchParams]);

    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) return;

        setIsLoading(true);
        const newSearchId = uuidv4();

        // Update URL strictly
        const params = new URLSearchParams(searchParams.toString());
        params.set("q", searchQuery);
        params.set("search_id", newSearchId);
        router.replace(`/search?${params.toString()}`);

        const profile = getSavedProfile();

        try {
            const response = await fetch(`${API_BASE}/api/search`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    search_id: newSearchId,
                    query: searchQuery,
                    profile: profile,
                    filters: { category: "All" }, // Simplify for MVP
                    top_k: 20
                })
            });

            if (!response.ok) throw new Error("API Error");

            const data = await response.json();
            setResults(data.results);
            setLatency(data.latency_ms);
            setMemoryActive(data.memory_influenced || false);

        } catch (error) {
            console.error("Search failed:", error);
            console.warn("⚠️ Using Offline Fallback Data");
            await new Promise(r => setTimeout(r, 1500)); // Fake latency for fallback feel
            setResults(MOCK_SCHOLARSHIPS);
            setLatency(45);
        } finally {
            setIsLoading(false);
            setCurrentStage("COMPLETE");
        }
    }, [router, searchParams]);

    // Initial load
    useEffect(() => {
        if (initialQuery && results.length === 0) {
            performSearch(initialQuery);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        performSearch(query);
    };

    return (
        <div className="flex flex-col min-h-screen">
            {/* Search Header Area */}
            <div className="p-6 border-b border-slate-800 bg-slate-950/50">
                <div className="max-w-4xl mx-auto space-y-4">
                    <form onSubmit={handleSearchSubmit} className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search scholarships (e.g., 'merit scholarship for engineering' or 'government scholarship')..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all outline-none font-medium"
                        />
                        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary text-xs py-1.5 ">
                            Search
                        </button>
                    </form>

                    {/* Progress Rail */}
                    {isLoading && (
                        <div className="flex items-center justify-between px-2 pt-2">
                            {STAGES.map((stage, idx) => {
                                const isActive = stage === currentStage;
                                const isPast = STAGES.indexOf(currentStage) > idx;

                                return (
                                    <div key={stage} className="flex flex-col items-center gap-2 relative flex-1">
                                        {/* Connector Line */}
                                        {idx !== 0 && (
                                            <div className={`absolute top-2.5 right-[50%] w-full h-[2px] -z-10 ${isPast ? 'bg-cyan-500/50' : 'bg-slate-800'}`} />
                                        )}

                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-all duration-300 ${isActive ? 'bg-cyan-500 text-slate-950 scale-110 shadow-[0_0_10px_#06b6d4]' :
                                            isPast ? 'bg-cyan-500/20 text-cyan-400' :
                                                'bg-slate-800 text-slate-600'
                                            }`}>
                                            {isPast ? <CheckCircle2 size={12} /> : isActive ? <CircleDashed size={12} className="animate-spin" /> : idx + 1}
                                        </div>
                                        <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>
                                            {STAGE_LABELS[stage]}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Results Area */}
            <div className="flex-1 bg-slate-950 p-6">
                <div className="max-w-4xl mx-auto">
                    {/* Loading State - Show Skeleton */}
                    {isLoading && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="h-5 bg-slate-800 rounded w-32 animate-pulse" />
                            </div>
                            <SearchSkeletonList />
                        </div>
                    )}

                    {/* Results Header */}
                    {!isLoading && results.length > 0 && (
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-semibold text-slate-200">
                                    Top Matches <span className="text-slate-500 font-normal ml-2">({results.length})</span>
                                </h2>
                                {memoryActive && (
                                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-medium">
                                        <Brain size={12} />
                                        AI Memory Active
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                                <Clock size={12} />
                                <span>{latency.toFixed(0)}ms</span>
                            </div>
                        </div>
                    )}

                    {/* Results List */}
                    {!isLoading && (
                        <div className="space-y-4">
                            <AnimatePresence>
                                {results.map((sch, idx) => (
                                    <motion.div
                                        key={sch.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        {sch.is_web_result ? (
                                            <a href={sch.application_link || "#"} target="_blank" rel="noopener noreferrer" className="block">
                                                <div className="glass-panel glass-panel-hover p-0 overflow-hidden group border-l-2 border-blue-500/50">
                                                    <div className="flex">
                                                        {/* Left Score Strip */}
                                                        <div className={`w-1.5 ${sch.match_score >= 85 ? 'bg-emerald-500' : sch.match_score >= 60 ? 'bg-amber-500' : 'bg-slate-700'}`} />

                                                        <div className="p-5 flex-1 flex gap-5">
                                                            {/* Score Box */}
                                                            <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-slate-900 border border-slate-800">
                                                                <span className={`text-xl font-bold ${sch.match_score >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                                    {sch.match_score}
                                                                </span>
                                                                <span className="text-[9px] text-slate-500 uppercase font-medium mt-0.5">Match</span>
                                                            </div>

                                                            {/* Content */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <h3 className="font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors truncate text-base">
                                                                            {sch.name}
                                                                        </h3>
                                                                        <p className="text-sm text-slate-400 mt-0.5">{sch.provider}</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-lg font-bold text-emerald-400 font-mono">
                                                                            ₹{sch.amount.toLocaleString()}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-3 mt-4">
                                                                    {sch.is_web_result ? (
                                                                        <span className="badge bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                                                            🌐 Web Result
                                                                        </span>
                                                                    ) : sch.verified ? (
                                                                        <span className="badge badge-verified">
                                                                            <ShieldCheck size={10} /> Verified
                                                                        </span>
                                                                    ) : null}
                                                                    {sch.scam_indicators && sch.scam_indicators.length > 0 && (
                                                                        <span className="badge badge-warning flex items-center gap-1">
                                                                            <AlertTriangle size={10} /> Suspicious
                                                                        </span>
                                                                    )}
                                                                    {sch.deadline_info && (
                                                                        <span className={`text-xs font-medium flex items-center gap-1.5 ${sch.deadline_info.urgency_level === 'critical' ? 'text-rose-400' : 'text-slate-400'
                                                                            }`}>
                                                                            <Clock size={12} />
                                                                            {sch.deadline_info.display_text}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center self-center text-slate-600 group-hover:translate-x-1 transition-transform">
                                                                <ChevronRight size={20} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </a>
                                        ) : (
                                            <Link href={`/details/${sch.id}`} className="block">
                                                <div className="glass-panel glass-panel-hover p-0 overflow-hidden group">
                                                    <div className="flex">
                                                        <div className={`w-1.5 ${sch.match_score >= 85 ? 'bg-emerald-500' : sch.match_score >= 60 ? 'bg-amber-500' : 'bg-slate-700'}`} />
                                                        <div className="p-5 flex-1 flex gap-5">
                                                            <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-slate-900 border border-slate-800">
                                                                <span className={`text-xl font-bold ${sch.match_score >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                                    {sch.match_score}
                                                                </span>
                                                                <span className="text-[9px] text-slate-500 uppercase font-medium mt-0.5">Match</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <h3 className="font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors truncate text-base">
                                                                            {sch.name}
                                                                        </h3>
                                                                        <p className="text-sm text-slate-400 mt-0.5">{sch.provider}</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-lg font-bold text-emerald-400 font-mono">
                                                                            ₹{sch.amount.toLocaleString()}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-3 mt-4">
                                                                    {sch.verified && (
                                                                        <span className="badge badge-verified">
                                                                            <ShieldCheck size={10} /> Verified
                                                                        </span>
                                                                    )}
                                                                    {sch.scam_indicators && sch.scam_indicators.length > 0 && (
                                                                        <span className="badge badge-warning flex items-center gap-1">
                                                                            <AlertTriangle size={10} /> Suspicious
                                                                        </span>
                                                                    )}
                                                                    {sch.deadline_info && (
                                                                        <span className={`text-xs font-medium flex items-center gap-1.5 ${sch.deadline_info.urgency_level === 'critical' ? 'text-rose-400' : 'text-slate-400'}`}>
                                                                            <Clock size={12} />
                                                                            {sch.deadline_info.display_text}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center self-center text-slate-600 group-hover:translate-x-1 transition-transform">
                                                                <ChevronRight size={20} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {/* Empty State - No results for query */}
                            {results.length === 0 && query && (
                                <div className="text-center py-20">
                                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
                                        <Search className="text-slate-600" size={24} />
                                    </div>
                                    <h3 className="text-slate-300 font-medium">No results found</h3>
                                    <p className="text-slate-500 text-sm mt-1">Try adjusting your search terms.</p>
                                </div>
                            )}

                            {/* Welcome State - No query yet */}
                            {results.length === 0 && !query && (
                                <div className="text-center py-16">
                                    <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-cyan-500/20">
                                        <Search className="text-cyan-400" size={32} />
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-2">Find Your Perfect Scholarship</h3>
                                    <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                                        Search using natural language. Try &quot;government scholarship for engineering&quot;
                                        or &quot;merit-based postgraduate scholarship&quot;
                                    </p>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {["NSP scholarship", "SC ST scholarship", "Central Sector Scheme", "engineering scholarship", "minority scholarship", "postgraduate fellowship"].map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                onClick={() => { setQuery(suggestion); performSearch(suggestion); }}
                                                className="px-3 py-1.5 rounded-full text-xs bg-slate-900 text-slate-400 border border-slate-800 hover:border-cyan-500/50 hover:text-cyan-400 transition"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
