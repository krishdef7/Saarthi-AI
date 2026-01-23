"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Brain, Trash2, Download, ExternalLink, Search } from "lucide-react";

interface TrackedScholarship {
    id: string;
    name: string;
    provider: string;
    amount: number;
    deadline?: string;
}

export default function TrackerPage() {
    const [tracked, setTracked] = useState<TrackedScholarship[]>([]);

    useEffect(() => {
        // Load from localStorage
        const saved = localStorage.getItem("mas_scholar_tracked");
        if (saved) {
            setTracked(JSON.parse(saved));
        } else {
            // Demo data
            setTracked([
                { id: "demo-1", name: "Post-Matric Scholarship for SC Students", provider: "Ministry of Social Justice", amount: 52000, deadline: "2026-03-31" },
                { id: "demo-2", name: "Merit-cum-Means for Minorities", provider: "Ministry of Minority Affairs", amount: 30000, deadline: "2026-03-31" }
            ]);
        }
    }, []);

    const removeItem = (id: string) => {
        const updated = tracked.filter(t => t.id !== id);
        setTracked(updated);
        localStorage.setItem("mas_scholar_tracked", JSON.stringify(updated));
    };

    const totalValue = tracked.reduce((sum, t) => sum + (t.amount || 0), 0);

    const exportReport = () => {
        const now = new Date().toISOString().split('T')[0];
        let report = `SAARTHI TRACKER REPORT\nGenerated: ${now}\n\n`;
        report += `Total Value: ₹${totalValue.toLocaleString()}\n`;
        report += `Scholarships: ${tracked.length}\n\n`;

        for (const sch of tracked) {
            report += `----------------------------------------\n`;
            report += `SCHOLARSHIP: ${sch.name}\n`;
            report += `PROVIDER: ${sch.provider}\n`;
            report += `AMOUNT: ₹${sch.amount?.toLocaleString()}\n`;
            report += `DEADLINE: ${sch.deadline || 'N/A'}\n`;
        }

        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mas_scholar_report.txt';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="glass-panel rounded-none border-t-0 border-x-0">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            <Brain className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold gradient-text">Saarthi AI</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/search" className="text-gray-400 hover:text-white flex items-center gap-2">
                            <Search className="w-4 h-4" /> Search
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">📋 Application Tracker</h1>
                        <p className="text-gray-400 mt-1">Track your scholarship applications</p>
                    </div>
                    {tracked.length > 0 && (
                        <button onClick={exportReport} className="btn-secondary flex items-center gap-2">
                            <Download className="w-4 h-4" /> Export Report
                        </button>
                    )}
                </div>

                {/* Summary */}
                {tracked.length > 0 && (
                    <div className="glass-panel mb-8 text-center p-8 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10" />
                        <div className="relative z-10">
                            <div className="text-5xl mb-3">🎯</div>
                            <div className="text-4xl font-bold gradient-text-success">
                                ₹{totalValue.toLocaleString()}
                            </div>
                            <div className="text-gray-400 mt-2">
                                Potential funding from {tracked.length} scholarship{tracked.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {tracked.length === 0 && (
                    <div className="glass-panel text-center py-16">
                        <div className="text-6xl mb-4">📭</div>
                        <h2 className="text-2xl font-bold mb-2">No scholarships tracked yet</h2>
                        <p className="text-gray-400 mb-6">
                            Search for scholarships and add them to your tracker
                        </p>
                        <Link href="/search" className="btn-primary">
                            Search Scholarships
                        </Link>
                    </div>
                )}

                {/* Tracked List */}
                <div className="space-y-4">
                    <AnimatePresence>
                        {tracked.map((sch, idx) => (
                            <motion.div
                                key={sch.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -100 }}
                                transition={{ delay: idx * 0.05 }}
                                className="glass-panel flex items-center gap-4"
                            >
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold truncate">{sch.name}</h3>
                                    <p className="text-sm text-gray-400">{sch.provider}</p>
                                    <div className="flex items-center gap-4 mt-2 text-sm">
                                        <span className="text-emerald-400 font-bold">₹{sch.amount?.toLocaleString()}</span>
                                        {sch.deadline && (
                                            <span className="text-gray-500">📅 {sch.deadline}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/details/${sch.id}`}
                                        className="p-2 rounded-lg bg-slate-800 text-gray-400 hover:text-white transition"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={() => removeItem(sch.id)}
                                        className="p-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition cursor-pointer"
                                        aria-label="Remove from tracker"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
