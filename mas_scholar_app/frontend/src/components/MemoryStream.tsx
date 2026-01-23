"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Cpu, Database, Award, CheckCircle, Search, AlertTriangle, ChevronRight, Activity } from "lucide-react";

// Strict stages mirroring Backend
enum SearchStage {
    START = "START",
    EMBEDDING = "EMBEDDING",
    VECTOR_SEARCH = "VECTOR_SEARCH",
    RRF_FUSION = "RRF_FUSION",
    SCORING = "SCORING",
    COMPLETE = "COMPLETE",
    ERROR = "ERROR",
}

interface WSEvent {
    search_id: string;
    stage: SearchStage;
    message: string;
    timestamp: string;
    meta: Record<string, unknown>;
}

export default function MemoryStream() {
    const searchParams = useSearchParams();
    const searchId = searchParams.get("search_id");

    const [events, setEvents] = useState<WSEvent[]>([]);
    const [activeStage, setActiveStage] = useState<SearchStage | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"}/ws/agent${searchId ? `?search_id=${searchId}` : "?search_id=global_listener"}`;

        // Cleanup previous
        if (wsRef.current) wsRef.current.close();

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => setIsConnected(true);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (searchId && data.search_id && data.search_id !== searchId) return;

                setEvents((prev) => [data, ...prev].slice(0, 50));
                setActiveStage(data.stage);

                // Auto-scroll if needed (though we reverse list typically)
            } catch (e) {
                console.error("WS Parse Error", e);
            }
        };

        ws.onclose = () => setIsConnected(false);

        return () => {
            ws.close();
        };
    }, [searchId]);

    // Icons mapping (AI Studio Style)
    const getTypeStyles = (stage: SearchStage) => {
        switch (stage) {
            case SearchStage.START:
                return { icon: <Terminal size={12} />, color: "text-emerald-400", border: "border-l-emerald-500", bg: "bg-emerald-500/5" };
            case SearchStage.EMBEDDING:
            case SearchStage.VECTOR_SEARCH:
                return { icon: <Database size={12} />, color: "text-cyan-400", border: "border-l-cyan-500", bg: "bg-cyan-500/5" };
            case SearchStage.RRF_FUSION:
                return { icon: <Activity size={12} />, color: "text-amber-400", border: "border-l-amber-500", bg: "bg-amber-500/5" };
            case SearchStage.SCORING:
                return { icon: <Award size={12} />, color: "text-violet-400", border: "border-l-violet-500", bg: "bg-violet-500/5" };
            case SearchStage.COMPLETE:
                return { icon: <CheckCircle size={12} />, color: "text-emerald-400", border: "border-l-emerald-500", bg: "bg-emerald-500/5" };
            default:
                return { icon: <AlertTriangle size={12} />, color: "text-rose-400", border: "border-l-rose-500", bg: "bg-rose-500/5" };
        }
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
    };

    if (isCollapsed) {
        return (
            <div
                onClick={() => setIsCollapsed(false)}
                className="fixed right-0 top-16 bottom-0 w-12 border-l border-slate-800 bg-slate-950 flex flex-col items-center py-4 cursor-pointer hover:bg-slate-900 transition z-30"
            >
                <Activity size={20} className="text-slate-500 mb-4" />
                <div className="writing-vertical text-xs text-slate-500 font-mono tracking-widest uppercase" style={{ writingMode: 'vertical-rl' }}>
                    Agent Memory
                </div>
            </div>
        );
    }

    return (
        <aside className="hidden lg:flex flex-col w-80 border-l border-slate-800 bg-slate-950 h-screen sticky top-0 font-mono">
            {/* Header */}
            <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-950">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-rose-500"}`} />
                    <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">System Reasoning</span>
                </div>
                <button onClick={() => setIsCollapsed(true)} className="text-slate-500 hover:text-white transition">
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Stream */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" ref={scrollRef}>
                <AnimatePresence initial={false}>
                    {events.map((evt, i) => {
                        const styles = getTypeStyles(evt.stage);

                        return (
                            <motion.div
                                key={`${evt.timestamp}-${i}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`mb-2 pl-3 py-2 rounded-r border-l-[3px] border-slate-700 ${styles.border} ${styles.bg} transition-all`}
                            >
                                <div className="flex items-center gap-2 mb-1 opacity-80">
                                    <span className={`font-bold ${styles.color} uppercase tracking-wider text-[10px]`}>
                                        {evt.stage}
                                    </span>
                                    <span className="text-[9px] text-slate-500 ml-auto font-sans">{formatTime(evt.timestamp)}</span>
                                </div>

                                <p className="text-slate-300 leading-relaxed text-[11px]">
                                    {evt.message}
                                </p>

                                {evt.meta && Object.keys(evt.meta).length > 0 && (
                                    <div className="mt-2 bg-slate-950/50 rounded p-1.5 border border-slate-800/50 block">
                                        <pre className="text-[9px] text-slate-500 overflow-x-auto whitespace-pre-wrap">
                                            {JSON.stringify(evt.meta, null, 1).replace(/[{}]/g, '').trim()}
                                        </pre>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {events.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                        <Terminal size={24} className="mb-2" />
                        <p className="text-xs">System Ready</p>
                    </div>
                )}
            </div>

            {/* Active State Footer */}
            {activeStage && activeStage !== "COMPLETE" && (
                <div className="p-3 border-t border-slate-800 bg-slate-900/30">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                        <span>PROCESSING</span>
                        <span className="text-cyan-400 animate-pulse">{activeStage}...</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 linear-progress" />
                    </div>
                </div>
            )}
        </aside>
    );
}
