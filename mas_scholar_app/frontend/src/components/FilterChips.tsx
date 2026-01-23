"use client";

import { useState } from "react";

interface FilterChipsProps {
    onFilterChange: (category: string) => void;
    activeFilter: string;
}

const CATEGORIES = [
    { value: "All", label: "All" },
    { value: "SC", label: "SC" },
    { value: "ST", label: "ST" },
    { value: "OBC", label: "OBC" },
    { value: "Minority", label: "Minority" },
    { value: "General", label: "Merit" },
];

export function FilterChips({ onFilterChange, activeFilter }: FilterChipsProps) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
                <button
                    key={cat.value}
                    onClick={() => onFilterChange(cat.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeFilter === cat.value
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                            : "bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700"
                        }`}
                >
                    {cat.label}
                </button>
            ))}
        </div>
    );
}
