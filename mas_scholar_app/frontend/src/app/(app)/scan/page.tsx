"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileImage, AlertTriangle, CheckCircle, Loader2, Search, X, Sparkles, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ExtractedData {
    name?: string;
    amount?: number;
    deadline?: string;
    category?: string;
    state?: string;
    education?: string;
    income?: string;
    searchSuggestions?: string[];
    confidence: number;
    aiPowered: boolean;
}

export default function ScanPage() {
    const router = useRouter();
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploadType, setUploadType] = useState<"poster" | "document">("poster");
    const [error, setError] = useState<string | null>(null);

    const processFile = useCallback(async (file: File) => {
        setIsProcessing(true);
        setError(null);

        // Revoke previous URL to prevent memory leak
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(URL.createObjectURL(file));

        const formData = new FormData();
        formData.append('file', file);

        try {
            const isImage = file.type.startsWith('image/');
            const endpoint = isImage ? '/api/scan/poster' : '/api/scan/upload';

            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.status === 'error') {
                setError(data.message || 'Processing failed');
                setExtractedData(null);
            } else if (isImage) {
                // Poster scan result
                setExtractedData({
                    name: data.scholarship_name || data.search_suggestions?.[0],
                    amount: data.amount,
                    deadline: data.deadline,
                    searchSuggestions: data.search_suggestions,
                    confidence: data.ai_powered ? 0.92 : 0.75,
                    aiPowered: data.ai_powered || false
                });
            } else {
                // Document scan result - profile extraction
                const profile = data.suggested_profile || {};
                setExtractedData({
                    name: profile.name,
                    category: profile.category,
                    state: profile.state,
                    education: profile.education,
                    income: profile.income,
                    confidence: data.ai_powered ? 0.95 : 0.70,
                    aiPowered: data.ai_powered || false
                });
            }
        } catch (err) {
            console.error('Scan failed:', err);
            setError('Failed to process file. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            processFile(file);
        }
    }, [processFile]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const reset = () => {
        // Revoke object URL to prevent memory leak
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setExtractedData(null);
        setPreviewUrl(null);
        setError(null);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const applyToProfile = () => {
        if (!extractedData) return;

        // Save extracted data to profile
        let profile = {};
        try {
            const existing = localStorage.getItem('mas_scholar_profile');
            profile = existing ? JSON.parse(existing) : {};
        } catch (e) {
            console.warn("Failed to parse profile from localStorage, starting fresh");
            localStorage.removeItem('mas_scholar_profile');
        }

        const updated = {
            ...profile,
            ...(extractedData.name && { name: extractedData.name }),
            ...(extractedData.category && { category: extractedData.category }),
            ...(extractedData.state && { state: extractedData.state }),
            ...(extractedData.education && { education: extractedData.education }),
            ...(extractedData.income && { income: parseInt(extractedData.income) || 0 })
        };

        localStorage.setItem('mas_scholar_profile', JSON.stringify(updated));
        router.push('/search');
    };

    return (
        <div className="p-6 md:p-12 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 rounded-xl">
                    <FileImage size={24} className="text-violet-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        AI Document Scanner
                        <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                            <Sparkles size={10} /> Gemini AI
                        </span>
                    </h1>
                    <p className="text-slate-400 text-sm">Upload scholarship posters for intelligent extraction and database search</p>
                </div>
            </div>

            {/* Upload Type Toggle - Removed based on user request to simplify */}
            <div className="hidden"></div>

            <AnimatePresence mode="wait">
                {!extractedData ? (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Upload Area */}
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            className={`glass-panel border-2 border-dashed p-16 text-center transition-all ${isDragging ? "border-cyan-500 bg-cyan-500/5" : "border-slate-700"
                                } ${isProcessing ? "pointer-events-none opacity-50" : "cursor-pointer hover:border-slate-600"}`}
                        >
                            {isProcessing ? (
                                <div className="flex flex-col items-center gap-4">
                                    <Loader2 size={48} className="text-cyan-400 animate-spin" />
                                    <div>
                                        <p className="text-lg font-semibold text-white">Processing with AI...</p>
                                        <p className="text-sm text-slate-400 mt-1">Gemini is analyzing your document</p>
                                    </div>
                                    <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                                        <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 linear-progress" />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Upload size={48} className="mx-auto text-slate-500 mb-4" />
                                    <p className="text-lg font-semibold text-white mb-2">
                                        Drop scholarship poster here
                                    </p>
                                    <p className="text-sm text-slate-400 mb-6">
                                        Supports PNG, JPG images up to 10MB
                                    </p>
                                    <label className="btn-primary cursor-pointer inline-flex items-center gap-2">
                                        <Upload size={16} />
                                        Choose File
                                        <input
                                            type="file"
                                            accept={uploadType === "poster" ? "image/*" : ".pdf,.txt,.md,.json"}
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                    </label>
                                </>
                            )}
                        </div>

                        {error && (
                            <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-3">
                                <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                                <div className="text-sm text-rose-300">{error}</div>
                            </div>
                        )}

                        {/* AI Note */}
                        <div className="mt-6 p-4 bg-gradient-to-r from-violet-500/5 to-cyan-500/5 border border-violet-500/20 rounded-lg flex items-start gap-3">
                            <Sparkles size={18} className="text-violet-400 shrink-0 mt-0.5" />
                            <div className="text-sm text-slate-300">
                                <strong className="text-violet-400">Powered by Gemini AI:</strong> Documents are analyzed using Google's Gemini 1.5 Flash
                                for intelligent extraction. Your data is processed securely with rate limiting.
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {/* Result Card */}
                        <div className="glass-panel overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b border-slate-800">
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={18} className="text-emerald-400" />
                                    <span className="font-semibold text-white">Extraction Complete</span>
                                    <span className="text-xs text-slate-500 font-mono ml-2">
                                        {(extractedData.confidence * 100).toFixed(0)}% confidence
                                    </span>
                                    {extractedData.aiPowered && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/30 flex items-center gap-1">
                                            <Sparkles size={10} /> AI
                                        </span>
                                    )}
                                </div>
                                <button onClick={reset} className="text-slate-400 hover:text-white">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="grid md:grid-cols-[200px_1fr] gap-6 p-6">
                                {/* Preview */}
                                {previewUrl && uploadType === "poster" && (
                                    <div className="aspect-[3/4] bg-slate-900 rounded-lg overflow-hidden">
                                        <img src={previewUrl} alt="Uploaded" className="w-full h-full object-cover" />
                                    </div>
                                )}

                                {/* Extracted Data */}
                                <div className="space-y-4">
                                    {extractedData.name && (
                                        <div>
                                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                                                {uploadType === "poster" ? "Scholarship Name" : "Student Name"}
                                            </div>
                                            <div className="text-xl font-bold text-white">{extractedData.name}</div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        {extractedData.amount && (
                                            <div>
                                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Amount</div>
                                                <div className="text-2xl font-bold text-emerald-400">
                                                    ₹{extractedData.amount.toLocaleString()}
                                                </div>
                                            </div>
                                        )}
                                        {extractedData.deadline && (
                                            <div>
                                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Deadline</div>
                                                <div className="text-lg font-semibold text-white">{extractedData.deadline}</div>
                                            </div>
                                        )}
                                        {extractedData.category && (
                                            <div>
                                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Category</div>
                                                <span className="badge badge-verified">{extractedData.category}</span>
                                            </div>
                                        )}
                                        {extractedData.state && (
                                            <div>
                                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">State</div>
                                                <div className="text-lg font-semibold text-white">{extractedData.state}</div>
                                            </div>
                                        )}
                                        {extractedData.education && (
                                            <div>
                                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Education</div>
                                                <div className="text-lg font-semibold text-white capitalize">{extractedData.education.replace('_', ' ')}</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Search Suggestions for Poster */}
                                    {extractedData.searchSuggestions && extractedData.searchSuggestions.length > 0 && (
                                        <div>
                                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Search Suggestions</div>
                                            <div className="flex flex-wrap gap-2">
                                                {extractedData.searchSuggestions.map((s, i) => (
                                                    <Link
                                                        key={i}
                                                        href={`/search?q=${encodeURIComponent(s)}`}
                                                        className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm hover:bg-cyan-500/20 transition"
                                                    >
                                                        {s}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-4 flex gap-3">
                                        {uploadType === "poster" ? (
                                            <Link
                                                href={`/search?q=${encodeURIComponent(extractedData.name || extractedData.searchSuggestions?.[0] || "")}`}
                                                className="btn-primary flex items-center gap-2"
                                            >
                                                <Search size={16} />
                                                Find in Database
                                            </Link>
                                        ) : (
                                            <button
                                                onClick={applyToProfile}
                                                className="btn-primary flex items-center gap-2"
                                            >
                                                <CheckCircle size={16} />
                                                Apply to Profile
                                            </button>
                                        )}
                                        <button onClick={reset} className="btn-secondary">
                                            Scan Another
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
