'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error for debugging (production would send to error tracking service)
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
                        <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/30">
                            <AlertTriangle className="w-10 h-10 text-rose-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-100 mb-3">
                            Something went wrong
                        </h2>
                        <p className="text-slate-400 mb-8 leading-relaxed">
                            We encountered an unexpected error. This has been logged and we&apos;re working on it.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-medium transition-all hover:scale-105 active:scale-95"
                                aria-label="Reload the application"
                            >
                                <RefreshCw size={18} />
                                Try Again
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-all hover:scale-105 active:scale-95 border border-slate-700"
                                aria-label="Go to home page"
                            >
                                <Home size={18} />
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
