"use client";

import { motion } from "framer-motion";

export function SearchResultSkeleton() {
    return (
        <div className="glass-panel p-0 overflow-hidden animate-pulse">
            <div className="flex">
                <div className="w-1.5 bg-slate-800" />
                <div className="p-5 flex-1 flex gap-5">
                    {/* Score Box */}
                    <div className="w-16 h-16 rounded-xl bg-slate-800" />

                    {/* Content */}
                    <div className="flex-1 space-y-3">
                        <div className="h-5 bg-slate-800 rounded w-3/4" />
                        <div className="h-4 bg-slate-800 rounded w-1/2" />
                        <div className="flex gap-2 mt-4">
                            <div className="h-5 w-16 bg-slate-800 rounded-full" />
                            <div className="h-5 w-20 bg-slate-800 rounded-full" />
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="h-6 w-20 bg-slate-800 rounded" />
                </div>
            </div>
        </div>
    );
}

export function SearchSkeletonList() {
    return (
        <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                >
                    <SearchResultSkeleton />
                </motion.div>
            ))}
        </div>
    );
}

export function DetailsSkeleton() {
    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8 animate-pulse">
            {/* Header */}
            <div className="space-y-4">
                <div className="h-8 bg-slate-800 rounded w-3/4" />
                <div className="h-5 bg-slate-800 rounded w-1/2" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="glass-panel p-6">
                        <div className="h-8 bg-slate-800 rounded w-1/2 mb-2" />
                        <div className="h-4 bg-slate-800 rounded w-1/3" />
                    </div>
                ))}
            </div>

            {/* Radar Placeholder */}
            <div className="glass-panel p-8">
                <div className="h-48 bg-slate-800 rounded-xl" />
            </div>
        </div>
    );
}
