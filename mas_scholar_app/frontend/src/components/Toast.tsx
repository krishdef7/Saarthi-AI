"use client";

import { memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    message: string;
    show: boolean;
    type?: ToastType;
    duration?: number;
    onClose: () => void;
}

const ICONS = {
    success: CheckCircle,
    error: X,
    warning: AlertTriangle,
    info: Info,
};

const STYLES = {
    success: 'bg-emerald-500/90 border-emerald-400',
    error: 'bg-rose-500/90 border-rose-400',
    warning: 'bg-amber-500/90 border-amber-400',
    info: 'bg-cyan-500/90 border-cyan-400',
};

const Toast = memo(function Toast({
    message,
    show,
    type = 'success',
    duration = 3000,
    onClose
}: ToastProps) {
    const Icon = ICONS[type];

    useEffect(() => {
        if (show && duration > 0) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration, onClose]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`fixed bottom-6 right-6 flex items-center gap-3 px-5 py-3.5 rounded-xl border backdrop-blur-sm shadow-2xl z-50 ${STYLES[type]}`}
                >
                    <Icon size={18} className="text-white shrink-0" />
                    <span className="text-white font-medium text-sm">{message}</span>
                    <button
                        onClick={onClose}
                        className="ml-2 p-1 rounded-full hover:bg-white/20 transition-colors"
                        aria-label="Close notification"
                    >
                        <X size={14} className="text-white/80" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
});

export default Toast;

// Custom hook for easy toast management
import { useState, useCallback } from 'react';

export function useToast() {
    const [toast, setToast] = useState<{
        show: boolean;
        message: string;
        type: ToastType;
    }>({
        show: false,
        message: '',
        type: 'success',
    });

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        setToast({ show: true, message, type });
    }, []);

    const hideToast = useCallback(() => {
        setToast(prev => ({ ...prev, show: false }));
    }, []);

    return { toast, showToast, hideToast };
}
