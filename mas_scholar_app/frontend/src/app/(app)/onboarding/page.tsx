"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Brain, ChevronRight, User, MapPin, IndianRupee, GraduationCap, Users, Upload, FileText, Loader2, AlertCircle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Validation helpers
interface ValidationError {
    field: string;
    message: string;
}

function validateStep1(data: { name: string; category: string }): ValidationError[] {
    const errors: ValidationError[] = [];
    if (!data.name.trim()) {
        errors.push({ field: "name", message: "Name is required" });
    } else if (data.name.trim().length < 2) {
        errors.push({ field: "name", message: "Name must be at least 2 characters" });
    } else if (data.name.trim().length > 100) {
        errors.push({ field: "name", message: "Name must be less than 100 characters" });
    }
    return errors;
}

function validateStep3(data: { income: string }): ValidationError[] {
    const errors: ValidationError[] = [];
    const incomeNum = parseInt(data.income);
    if (data.income && (isNaN(incomeNum) || incomeNum < 0)) {
        errors.push({ field: "income", message: "Income must be a valid positive number" });
    } else if (incomeNum > 100000000) {
        errors.push({ field: "income", message: "Income seems too high, please verify" });
    }
    return errors;
}

export default function Onboarding() {
    const router = useRouter();

    const [step, setStep] = useState(1);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const [formData, setFormData] = useState({
        name: "",
        category: "General",
        state: "All India",
        income: "",
        education: "undergraduate",
        gender: "Any"
    });

    // Compute validation errors for current step
    const currentErrors = useMemo(() => {
        if (step === 1) return validateStep1(formData);
        if (step === 3) return validateStep3(formData);
        return [];
    }, [step, formData]);

    const getFieldError = (field: string) => {
        if (!touched[field]) return null;
        return currentErrors.find(e => e.field === field)?.message || null;
    };

    const handleFieldBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadStatus("Scanning document...");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch(`${API_BASE}/api/scan/upload`, {
                method: "POST",
                body: formData,
            });
            const data = await response.json();

            if (data.status === "success" && data.suggested_profile) {
                setFormData(prev => ({
                    ...prev,
                    ...data.suggested_profile
                }));
                setUploadStatus("✅ Profile auto-filled from document!");
            } else {
                setUploadStatus("⚠️ Could not extract profile data");
            }
        } catch (error) {
            console.error("Upload failed", error);
            setUploadStatus("❌ Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    const categories = ["General", "OBC", "SC", "ST", "Minority"];
    const states = [
        "All India", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
        "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
        "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
        "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"
    ];

    const handleNext = () => {
        // Validate current step before proceeding
        let errors: ValidationError[] = [];
        if (step === 1) {
            errors = validateStep1(formData);
            setTouched({ name: true, category: true });
        } else if (step === 3) {
            errors = validateStep3(formData);
            setTouched(prev => ({ ...prev, income: true }));
        }

        if (errors.length > 0) {
            setValidationErrors(errors);
            return;
        }

        setValidationErrors([]);
        if (step < 3) setStep(step + 1);
        else handleSubmit();
    };

    const handleSubmit = () => {
        // Save to localStorage
        const profile = {
            ...formData,
            income: parseInt(formData.income) || 0
        };

        if (typeof window !== "undefined") {
            localStorage.setItem("mas_scholar_profile", JSON.stringify(profile));
        }

        router.push("/search");
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel max-w-lg w-full p-8 relative z-10"
            >
                <div className="flex items-center gap-2 mb-8 justify-center">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold gradient-text">Saarthi AI</span>
                </div>

                {/* Progress Bar */}
                <div className="flex gap-2 mb-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-cyan-500" : "bg-slate-800"}`} />
                    ))}
                </div>

                <h1 className="text-2xl font-bold text-center mb-2">Build Your Profile</h1>
                <p className="text-gray-400 text-center mb-6 text-sm">
                    Let AI match you with the perfect scholarships.
                </p>

                {/* Manual entry only */}

                {/* Step 1: Basics */}
                {step === 1 && (
                    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400 flex items-center gap-2"><User className="w-4 h-4" /> Full Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                onBlur={() => handleFieldBlur("name")}
                                className={`w-full bg-slate-800/50 border rounded-lg p-3 text-white focus:border-cyan-500 outline-none transition-colors ${
                                    getFieldError("name") ? "border-red-500" : "border-slate-700"
                                }`}
                                placeholder="Enter your name"
                                aria-invalid={!!getFieldError("name")}
                                aria-describedby={getFieldError("name") ? "name-error" : undefined}
                            />
                            {getFieldError("name") && (
                                <p id="name-error" className="text-red-400 text-xs flex items-center gap-1 mt-1">
                                    <AlertCircle className="w-3 h-3" /> {getFieldError("name")}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400 flex items-center gap-2"><Users className="w-4 h-4" /> Category</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none"
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </motion.div>
                )}

                {/* Step 2: Demographics */}
                {step === 2 && (
                    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400 flex items-center gap-2"><MapPin className="w-4 h-4" /> State / Domicile</label>
                            <select
                                value={formData.state}
                                onChange={e => setFormData({ ...formData, state: e.target.value })}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none"
                            >
                                {states.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400 flex items-center gap-2"><User className="w-4 h-4" /> Gender</label>
                            <select
                                value={formData.gender}
                                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none"
                            >
                                <option value="Any">Any</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </motion.div>
                )}

                {/* Step 3: Financial & Education */}
                {step === 3 && (
                    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400 flex items-center gap-2"><IndianRupee className="w-4 h-4" /> Annual Family Income</label>
                            <input
                                type="number"
                                value={formData.income}
                                onChange={e => setFormData({ ...formData, income: e.target.value })}
                                onBlur={() => handleFieldBlur("income")}
                                className={`w-full bg-slate-800/50 border rounded-lg p-3 text-white focus:border-cyan-500 outline-none transition-colors ${
                                    getFieldError("income") ? "border-red-500" : "border-slate-700"
                                }`}
                                placeholder="e.g. 500000"
                                aria-invalid={!!getFieldError("income")}
                                aria-describedby={getFieldError("income") ? "income-error" : undefined}
                            />
                            {getFieldError("income") && (
                                <p id="income-error" className="text-red-400 text-xs flex items-center gap-1 mt-1">
                                    <AlertCircle className="w-3 h-3" /> {getFieldError("income")}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400 flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Current Education Level</label>
                            <select
                                value={formData.education}
                                onChange={e => setFormData({ ...formData, education: e.target.value })}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none"
                            >
                                <option value="class_10">Class 10</option>
                                <option value="class_12">Class 12</option>
                                <option value="undergraduate">Undergraduate</option>
                                <option value="postgraduate">Postgraduate</option>
                                <option value="doctorate">PhD / Doctorate</option>
                            </select>
                        </div>
                    </motion.div>
                )}

                <button
                    onClick={handleNext}
                    className="w-full mt-8 btn-primary py-3 flex items-center justify-center gap-2 font-semibold"
                >
                    {step === 3 ? "Complete Profile" : "Next Step"} <ChevronRight className="w-4 h-4" />
                </button>

                <button
                    onClick={() => {
                        // Create default demo profile and skip
                        const defaultProfile = {
                            name: "Student",
                            category: "General",
                            state: "All India",
                            income: 500000,
                            education: "undergraduate",
                            gender: "Any"
                        };
                        if (typeof window !== "undefined") {
                            localStorage.setItem("mas_scholar_profile", JSON.stringify(defaultProfile));
                        }
                        router.push("/search");
                    }}
                    className="w-full mt-3 text-sm text-slate-500 hover:text-slate-300 transition py-2"
                >
                    Skip with default profile →
                </button>

            </motion.div>
        </div>
    );
}
