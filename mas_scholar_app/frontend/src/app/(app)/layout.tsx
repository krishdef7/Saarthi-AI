"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Bookmark,
    BarChart3,
    Menu,
    ShieldCheck,
    Compass,
    FileSearch
} from 'lucide-react';
import Link from 'next/link';
import MemoryStream from '@/components/MemoryStream';

interface SavedProfile {
    name?: string;
    category?: string;
    state?: string;
}

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [profile, setProfile] = useState<SavedProfile | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('mas_scholar_profile');
        if (saved) {
            setProfile(JSON.parse(saved));
        }
    }, []);

    const initials = profile?.name
        ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'ME';
    return (
        <div className="overflow-hidden h-screen flex">
            {/* LEFT SIDEBAR - NAVIGATION */}
            <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col z-20 hidden md:flex">
                <div className="p-4 border-b border-slate-800 flex items-center gap-3 h-16">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/20">
                            <Compass size={18} className="text-white" />
                        </div>
                        <span className="font-semibold tracking-tight text-white">Saarthi AI</span>
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <SidebarItem icon={<LayoutDashboard size={18} />} label="Discover" href="/search" pathname={pathname} />
                    <SidebarItem icon={<FileSearch size={18} />} label="Scan Document" href="/scan" pathname={pathname} />
                    <SidebarItem icon={<Bookmark size={18} />} label="Saved" href="/shortlist" pathname={pathname} />
                    <SidebarItem icon={<BarChart3 size={18} />} label="Impact" href="/stats" pathname={pathname} />
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <Link href="/onboarding" className="glass-panel p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-800/50 transition">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-medium text-white">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">{profile?.name || 'Set Up Profile'}</div>
                            <div className="text-xs text-slate-500">{profile?.category || 'Click to configure'}</div>
                        </div>
                    </Link>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col min-w-0 relative">
                {/* TOP BAR */}
                <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="md:hidden">
                            <Menu className="text-slate-400" />
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-sm text-slate-500">
                            <span>Education</span>
                            <span>/</span>
                            <span className="text-slate-200">Scholarships</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-400">
                            <ShieldCheck size={14} />
                            <span>Verified Data</span>
                        </div>
                    </div>
                </header>

                {/* SCROLLABLE PAGE CONTENT */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {children}
                </div>
            </main>

            {/* RIGHT SIDEBAR - AGENT MEMORY */}
            <MemoryStream />
        </div>
    );
}

function SidebarItem({ icon, label, href, pathname }: { icon: React.ReactNode, label: string, href: string, pathname: string }) {
    const isActive = pathname === href || pathname.startsWith(href + '/');

    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
        >
            {icon}
            <span>{label}</span>
        </Link>
    );
}
