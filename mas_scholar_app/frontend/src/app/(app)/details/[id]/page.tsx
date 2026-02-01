"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, FileText, ExternalLink, Share2, Heart, Info, Clock, Ban, Brain, ChevronDown, ChevronUp } from "lucide-react";
import EligibilityRadar from "@/components/RadarChart";
import { DetailsSkeleton } from "@/components/Skeletons";
import Toast, { useToast } from "@/components/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ... Interfaces ... (Same as before)
interface Scholarship {
    id: string;
    name: string;
    provider: string;
    amount: number;
    description: string;
    deadline: string;
    verified: boolean;
    trust_score: number;
    scam_indicators: string[];
    application_link?: string;
    deadline_info?: { display_text: string; urgency_level: string };
}

interface EligibilityData {
    scholarship_id: string;
    is_eligible: boolean;
    match_score: number;
    radar_chart: Record<string, number>;
    breakdown: Array<{
        criterion: string;
        passed: boolean;
        explanation: string;
        status: string;
    }>;
    missing_docs: string[];
}

function getSavedProfile() {
    if (typeof window === "undefined") return null;
    try {
        const saved = localStorage.getItem("mas_scholar_profile");
        return saved ? JSON.parse(saved) : null;
    } catch (e) {
        console.warn("Failed to parse profile from localStorage, clearing corrupted data");
        localStorage.removeItem("mas_scholar_profile");
        return null;
    }
}

export default function DetailsPage() {
    const { id } = useParams();
    const router = useRouter();

    const [scholarship, setScholarship] = useState<Scholarship | null>(null);
    const [eligibility, setEligibility] = useState<EligibilityData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isShortlisted, setIsShortlisted] = useState(false);
    const [showFullBreakdown, setShowFullBreakdown] = useState(false);
    const { toast, showToast, hideToast } = useToast();

    // Log click interaction to memory
    const logClickInteraction = async () => {
        try {
            const profile = getSavedProfile();
            if (!profile) return;

            const userId = btoa(`${profile.name}_${profile.category}`).slice(0, 12);
            await fetch(`${API_BASE}/api/log-interaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    scholarship_id: id,
                    scholarship_name: scholarship?.name || '',
                    interaction_type: 'click'
                })
            });
        } catch {
            // Silent fail - interaction logging is non-critical
        }
    };

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch Logic (Using Mock fallback if needed in prod, but keeping strict for now)
                const schRes = await fetch(`${API_BASE}/api/scholarships/${id}`);
                if (!schRes.ok) throw new Error("Scholarship not found");
                const schData = await schRes.json();
                setScholarship(schData);

                const profile = getSavedProfile();
                if (profile) {
                    const eligRes = await fetch(`${API_BASE}/api/eligibility`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ scholarship_id: id, profile: profile })
                    });
                    const eligData = await eligRes.json();
                    setEligibility(eligData);
                }
            } catch (err) {
                console.error("Failed to load details", err);
                setError(err instanceof Error ? err.message : "Failed to load scholarship details");
                setScholarship(null);
            } finally {
                setLoading(false);
            }
        }
        if (id) {
            fetchData();
            // Log this click to memory after a short delay
            setTimeout(() => logClickInteraction(), 500);
        }

        // Check if already shortlisted (with safe JSON parsing)
        try {
            const saved = localStorage.getItem("mas_scholar_shortlist");
            if (saved) {
                const shortlist = JSON.parse(saved);
                setIsShortlisted(shortlist.some((s: { id: string }) => s.id === id));
            }
        } catch (e) {
            console.warn("Failed to parse shortlist from localStorage");
            localStorage.removeItem("mas_scholar_shortlist");
        }
    }, [id]);

    const toggleShortlist = () => {
        if (!scholarship) return;

        let shortlist: Array<{ id: string; name: string; provider: string; amount: number; saved_at: string }> = [];
        try {
            const saved = localStorage.getItem("mas_scholar_shortlist");
            shortlist = saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.warn("Failed to parse shortlist, starting fresh");
            shortlist = [];
        }

        if (isShortlisted) {
            shortlist = shortlist.filter((s: { id: string }) => s.id !== id);
        } else {
            shortlist.push({
                id: scholarship.id,
                name: scholarship.name,
                provider: scholarship.provider,
                amount: scholarship.amount,
                saved_at: new Date().toISOString()
            });
        }

        localStorage.setItem("mas_scholar_shortlist", JSON.stringify(shortlist));
        setIsShortlisted(!isShortlisted);

        // Show toast notification
        if (!isShortlisted) {
            showToast(`${scholarship.name} added to shortlist`, 'success');
        } else {
            showToast(`Removed from shortlist`, 'info');
        }
    };

    if (loading) return <DetailsSkeleton />;

    if (error) {
        return (
            <div className="p-10 text-center">
                <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
                    <AlertTriangle className="text-rose-400" size={24} />
                </div>
                <h3 className="text-rose-400 font-medium mb-2">Failed to load scholarship</h3>
                <p className="text-slate-500 text-sm mb-4">{error}</p>
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition"
                >
                    Go Back
                </button>
            </div>
        );
    }

    if (!scholarship) return <div className="p-10 text-center text-slate-500">Scholarship not found.</div>;

    const isScam = scholarship.scam_indicators && scholarship.scam_indicators.length > 0;

    return (
        <div className="pb-20">
            {/* Context Header */}
            <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition cursor-pointer" aria-label="Go back">
                    <ArrowLeft size={16} /> Back
                </button>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleShortlist}
                        className={`p-2 rounded-lg border transition cursor-pointer ${isShortlisted ? 'bg-rose-500/10 border-rose-500/50 text-rose-400' : 'border-slate-700 text-slate-400 hover:text-white'}`}
                        aria-label={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
                    >
                        <Heart size={18} fill={isShortlisted ? "currentColor" : "none"} />
                    </button>
                    <button
                        onClick={async () => {
                            const shareData = {
                                title: scholarship?.name || 'Scholarship',
                                text: `Check out this scholarship: ${scholarship?.name} - ₹${scholarship?.amount?.toLocaleString()}`,
                                url: window.location.href
                            };
                            try {
                                if (navigator.share) {
                                    await navigator.share(shareData);
                                } else {
                                    await navigator.clipboard.writeText(window.location.href);
                                    alert('Link copied to clipboard!');
                                }
                            } catch {
                                // Share cancelled by user or failed - silent fail
                            }
                        }}
                        className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                        aria-label="Share scholarship"
                    >
                        <Share2 size={18} />
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-6 space-y-8">

                {/* ACTIVE SAFETY BLOCK */}
                {isScam && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-6 flex gap-4 items-start"
                    >
                        <div className="p-3 bg-rose-500/10 rounded-full text-rose-400">
                            <Ban size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-rose-400 font-bold text-lg mb-1">Application Blocked: Potential Fraud Detected</h3>
                            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                                Our AI detected {scholarship.scam_indicators.length} high-risk patterns ("{scholarship.scam_indicators.join('", "')}").
                                To protect your finances and identity, we have disabled the application link.
                            </p>
                            <div className="text-xs text-rose-300/70 font-mono">
                                SAFETY_PROTOCOL_ENFORCED • ID: {scholarship.id}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Hero Layout */}
                <div className="grid md:grid-cols-[2fr_1fr] gap-8">
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                {scholarship.verified && (
                                    <span className="badge badge-verified"><ShieldCheck size={12} /> Verified Source</span>
                                )}
                                <span className="badge badge-provider">{scholarship.provider}</span>
                                <span className="text-xs text-slate-500 font-mono ml-auto">Last updated today</span>
                            </div>

                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                                {scholarship.name}
                            </h1>

                            <div className="flex items-center gap-6 text-sm text-slate-400 border-y border-slate-800 py-4 mb-6">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                    <span>Eligibility: <strong>{eligibility?.match_score ?? 'N/A'}% Match</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={16} className="text-amber-400" />
                                    <span>Deadline: <strong>{scholarship.deadline_info?.display_text || scholarship.deadline}</strong></span>
                                </div>
                            </div>

                            <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                                <h3 className="text-slate-100 font-semibold mb-2">About this Opportunity</h3>
                                <p>{scholarship.description}</p>
                            </div>
                        </div>

                        {/* Missing Docs (Actionable) */}
                        {eligibility?.missing_docs && eligibility.missing_docs.length > 0 && (
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
                                <h4 className="text-amber-400 font-medium mb-3 flex items-center gap-2">
                                    <AlertTriangle size={16} /> Action Required
                                </h4>
                                <ul className="space-y-2">
                                    {eligibility.missing_docs.map((doc, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                                            {doc}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Why This Matched You - AI Reasoning Section */}
                        {eligibility && (
                            <div className="bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-500/20 rounded-xl p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-cyan-500/10 rounded-lg">
                                        <Brain size={20} className="text-cyan-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-semibold">Why This Matched You</h4>
                                        <p className="text-xs text-slate-500">AI-generated reasoning based on your profile</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {eligibility.breakdown.slice(0, showFullBreakdown ? undefined : 4).map((item, i) => (
                                        <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${item.passed ? 'bg-emerald-500/5' : 'bg-slate-800/50'}`}>
                                            {item.passed ?
                                                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" /> :
                                                <XCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                                            }
                                            <div>
                                                <span className="text-sm text-white font-medium">{item.criterion}</span>
                                                <p className="text-xs text-slate-400 mt-0.5">{item.explanation}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {eligibility.breakdown.length > 4 && (
                                    <button
                                        onClick={() => setShowFullBreakdown(!showFullBreakdown)}
                                        className="w-full mt-4 text-sm text-cyan-400 hover:text-cyan-300 font-medium flex items-center justify-center gap-1"
                                    >
                                        {showFullBreakdown ? (
                                            <>Show Less <ChevronUp size={14} /></>
                                        ) : (
                                            <>View All {eligibility.breakdown.length} Criteria <ChevronDown size={14} /></>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Rail: Action & Analysis */}
                    <div className="space-y-6">
                        {/* Amount Card */}
                        <div className="glass-panel p-6 text-center">
                            <div className="text-sm text-slate-500 font-mono mb-1 uppercase tracking-wider">Grant Value</div>
                            <div className="text-4xl font-bold text-emerald-400 mb-6">₹{scholarship.amount.toLocaleString()}</div>

                            {isScam ? (
                                <button disabled className="w-full btn-secondary opacity-50 cursor-not-allowed flex items-center justify-center gap-2 bg-slate-800 text-slate-500 border-transparent">
                                    <Ban size={16} /> Application Disabled
                                </button>
                            ) : (
                                <a
                                    href={scholarship.application_link || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full btn-primary flex items-center justify-center gap-2 group"
                                >
                                    Apply on Official Site <ExternalLink size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                </a>
                            )}

                            <p className="text-xs text-slate-500 mt-3">
                                Redirects to {scholarship.provider} portal
                            </p>
                        </div>

                        {/* Radar Analysis */}
                        {eligibility && (
                            <div className="glass-panel p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-sm">Eligibility Fit</h3>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${eligibility.is_eligible ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                        {eligibility.is_eligible ? 'STRONG MATCH' : 'CONDITIONAL'}
                                    </span>
                                </div>
                                <div className="-ml-6">
                                    <EligibilityRadar data={eligibility.radar_chart} />
                                </div>

                                <div className="space-y-3 mt-4">
                                    {eligibility.breakdown.slice(0, 3).map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 text-xs">
                                            {item.passed ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" /> : <XCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />}
                                            <span className="text-slate-400 leading-snug">{item.explanation}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setShowFullBreakdown(true)}
                                    className="w-full mt-4 text-xs text-cyan-400 hover:text-cyan-300 font-medium border-t border-slate-800 pt-3 cursor-pointer"
                                >
                                    View Full Analysis breakdown
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            <Toast
                message={toast.message}
                show={toast.show}
                type={toast.type}
                onClose={hideToast}
            />
        </div>
    );
}
