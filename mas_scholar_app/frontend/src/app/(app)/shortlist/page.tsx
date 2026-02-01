"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, Trash2, ArrowRight, Search } from "lucide-react";
import Link from "next/link";

interface SavedScholarship {
    id: string;
    name: string;
    provider: string;
    amount: number;
    match_score?: number;
    saved_at: string;
}

export default function ShortlistPage() {
    const [items, setItems] = useState<SavedScholarship[]>([]);

    useEffect(() => {
        // Load from localStorage with safe parsing
        try {
            const saved = localStorage.getItem("mas_scholar_shortlist");
            if (saved) {
                setItems(JSON.parse(saved));
            }
        } catch (e) {
            console.warn("Failed to parse shortlist from localStorage");
            localStorage.removeItem("mas_scholar_shortlist");
        }
    }, []);

    const removeItem = (id: string) => {
        const updated = items.filter(i => i.id !== id);
        setItems(updated);
        localStorage.setItem("mas_scholar_shortlist", JSON.stringify(updated));
    };

    const totalValue = items.reduce((sum, item) => sum + (item.amount || 0), 0);

    return (
        <div className="p-6 md:p-12 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
                    <Bookmark size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Saved Scholarships</h1>
                    <p className="text-slate-400 text-sm">Scholarships you've bookmarked for later review.</p>
                </div>
            </div>

            {/* Summary Banner */}
            {items.length > 0 && (
                <div className="glass-panel mb-8 p-6 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5" />
                    <div className="relative z-10">
                        <div className="text-sm text-slate-400 mb-1">Total Potential Funding</div>
                        <div className="text-3xl font-bold gradient-text-success">
                            ₹{totalValue.toLocaleString()}
                        </div>
                        <div className="text-slate-500 text-sm mt-1">from {items.length} saved scholarship{items.length !== 1 ? 's' : ''}</div>
                    </div>
                </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {items.map((item) => (
                        <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="glass-panel p-0 overflow-hidden flex flex-col group"
                        >
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="badge badge-provider">{item.provider}</span>
                                    <button
                                        onClick={() => removeItem(item.id)}
                                        className="text-slate-600 hover:text-rose-400 transition cursor-pointer"
                                        aria-label="Remove from shortlist"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <Link href={`/details/${item.id}`}>
                                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors line-clamp-2">
                                        {item.name}
                                    </h3>
                                </Link>

                                <div className="flex items-end justify-between mt-4">
                                    <div>
                                        <div className="text-xs text-slate-500 mb-0.5">Value</div>
                                        <div className="text-xl font-bold text-emerald-400">₹{item.amount.toLocaleString()}</div>
                                    </div>
                                    {item.match_score && (
                                        <div className="text-right">
                                            <div className="text-xs text-slate-500 mb-0.5">Match</div>
                                            <div className="text-lg font-bold text-slate-200">{item.match_score}%</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-slate-800 p-3 bg-slate-900/50 flex gap-2">
                                <Link
                                    href={`/details/${item.id}`}
                                    className="flex-1 btn-secondary text-xs py-2 flex items-center justify-center gap-2"
                                >
                                    View Details <ArrowRight size={12} />
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Empty State / Add More Card */}
                <motion.div
                    layout
                    className="glass-panel border-dashed border-slate-800 flex flex-col items-center justify-center p-8 text-center opacity-50 hover:opacity-100 hover:border-slate-700 transition group cursor-pointer"
                >
                    <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mb-4 group-hover:bg-slate-800">
                        <Bookmark size={20} className="text-slate-600 group-hover:text-slate-400" />
                    </div>
                    <h3 className="text-slate-400 font-medium mb-1">
                        {items.length === 0 ? "No Scholarships Saved" : "Add More"}
                    </h3>
                    <Link href="/search" className="text-xs text-cyan-500 hover:underline flex items-center gap-1 mt-2">
                        <Search size={12} /> Browse Scholarships
                    </Link>
                </motion.div>
            </div>
        </div>
    );
}
