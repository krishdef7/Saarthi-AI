"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles, Shield, Zap, ChevronRight, Compass, Brain } from "lucide-react";
import Link from "next/link";

// API base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Statistics {
  total: number;
  verified: number;
  total_value_cr: number;
  by_category: Record<string, number>;
}

export default function Home() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch statistics
    fetch(`${API_BASE}/api/statistics`)
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setIsLoading(false);
      })
      .catch(() => {
        // Demo fallback
        setStats({
          total: 185,
          verified: 146,
          total_value_cr: 30.6,
          by_category: { SC: 41, ST: 45, OBC: 44, Minority: 43, General: 13 }
        });
        setIsLoading(false);
      });
  }, []);

  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-panel rounded-none border-t-0 border-x-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">Saarthi AI</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/search" className="text-gray-400 hover:text-white transition">Search</Link>
            <Link href="/shortlist" className="text-gray-400 hover:text-white transition">Saved</Link>
            <Link href="/stats" className="text-gray-400 hover:text-white transition">Impact</Link>
          </div>
          <Link href="/onboarding" className="btn-primary text-sm">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-cyan-500/20 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-8">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 text-sm font-medium">AI-Powered Scholarship Discovery</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Don&apos;t let money stop your{" "}
              <span className="gradient-text">education.</span>
            </h1>

            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Saarthi AI connects you with <span className="text-white font-semibold">{stats?.total || 185}+</span> verified
              government and private scholarships matched to your profile.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/onboarding" className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
                Get Started <ChevronRight className="w-5 h-5" />
              </Link>
              <Link href="/search" className="px-8 py-4 rounded-xl border border-slate-700 text-slate-300 hover:border-cyan-500/50 hover:text-white transition flex items-center gap-2">
                <Search className="w-5 h-5" /> Browse Scholarships
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: "📚", value: `${stats?.total || 185}+`, label: "Verified Scholarships" },
              { icon: "🛡️", value: `${stats?.verified || 146}`, label: "Official Sources" },
              { icon: "💰", value: `₹${stats?.total_value_cr || 30.6}Cr`, label: "Total Value" },
              { icon: "⚡", value: "<100ms", label: "Search Speed" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-panel text-center hover-lift"
              >
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why <span className="gradient-text">Saarthi AI</span>?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="w-8 h-8" />,
                title: "Hybrid AI Search",
                desc: "Vector + BM25 fusion finds scholarships you'd never discover with keyword search alone.",
                gradient: "from-cyan-500 to-blue-600"
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: "Scam Protection",
                desc: "23+ fraud patterns detected. Trust scores on every result. Never pay to apply!",
                gradient: "from-rose-500 to-red-600"
              },
              {
                icon: <Brain className="w-8 h-8" />,
                title: "Explainable AI",
                desc: "See exactly why each scholarship matched with transparent 100-point scoring.",
                gradient: "from-emerald-500 to-green-600"
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                className="glass-panel glass-panel-hover text-center p-8"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-5 mx-auto shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="glass-panel text-center p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-4">
                Ready to find your perfect scholarship?
              </h2>
              <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                Complete your profile in 30 seconds and discover scholarships matched to your eligibility.
              </p>
              <Link href="/onboarding" className="btn-primary text-lg px-8 py-4">
                Start Your Search 🚀
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold">Saarthi AI</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://qdrant.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-400 hover:text-white hover:border-cyan-500/50 transition"
            >
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
              Powered by Qdrant
            </a>
            <p className="text-sm text-gray-500">
              🔒 Privacy First • Built with ❤️ for Indian Students
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
