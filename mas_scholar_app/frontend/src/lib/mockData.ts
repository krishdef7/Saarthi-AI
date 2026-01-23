export const MOCK_SCHOLARSHIPS = [
    {
        id: "demo-gov-1",
        name: "Post-Matric Scholarship for SC Students",
        provider: "Ministry of Social Justice",
        provider_type: "government",
        amount: 50000,
        match_score: 95,
        eligibility_status: "eligible",
        verified: true,
        trust_score: 0.98,
        category: ["SC"],
        description: "Complete financial assistance for Scheduled Caste students studying at post-matriculation or post-secondary stage.",
        deadline_info: { display_text: "🟢 45 days remaining", urgency_level: "normal", days_remaining: 45 },
        scam_indicators: []
    },
    {
        id: "demo-gov-2",
        name: "Central Sector Scheme of Scholarship",
        provider: "Department of Higher Education",
        provider_type: "government",
        amount: 20000,
        match_score: 88,
        eligibility_status: "eligible",
        verified: true,
        trust_score: 0.95,
        category: ["General", "OBC", "SC", "ST"],
        description: "Financial support to meritorious students from low income families to meet a part of their day-to-day expenses.",
        deadline_info: { display_text: "🟡 15 days remaining", urgency_level: "warning", days_remaining: 15 },
        scam_indicators: []
    },
    {
        id: "demo-pvt-1",
        name: "HDFC Badhte Kadam Scholarship",
        provider: "HDFC Bank",
        provider_type: "csr",
        amount: 100000,
        match_score: 75,
        eligibility_status: "conditional",
        verified: true,
        trust_score: 0.90,
        category: ["General", "OBC", "SC", "ST"],
        description: "Support for high-performing students from underprivileged backgrounds.",
        deadline_info: { display_text: "🟢 60 days remaining", urgency_level: "normal", days_remaining: 60 },
        scam_indicators: []
    },
    {
        id: "demo-scam-1",
        name: "Direct Direct Bank Transfer Scheme 100% Guaranteed",
        provider: "Unknown Agency",
        provider_type: "private",
        amount: 500000,
        match_score: 10,
        eligibility_status: "not_eligible",
        verified: false,
        trust_score: 0.1,
        category: ["General"],
        description: "Pay processing fee of ₹500 and get instant scholarship directly in bank account. Act fast!",
        deadline_info: { display_text: "🔴 Expires TODAY", urgency_level: "critical", days_remaining: 0 },
        scam_indicators: ["processing fee", "instant", "act fast"]
    }
];

export const MOCK_SEARCH_LOGS = [
    "🚀 Initializing search...",
    "🔍 Query analyzed: 'merit scholarship'",
    "🧠 Generating embeddings (Offline Mode)...",
    "📊 Searching local fallback database...",
    "✅ Found 4 mock records",
    "🔀 Applying safety filters...",
    "⚡ Search complete (Offline Fallback)"
];
