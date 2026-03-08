import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);

const ICONS = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info',
};

const COLORS = {
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    warning: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
        return id;
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = {
        success: (msg) => addToast(msg, 'success'),
        error: (msg) => addToast(msg, 'error'),
        warning: (msg) => addToast(msg, 'warning'),
        info: (msg) => addToast(msg, 'info'),
        loading: (msg) => addToast(msg, 'info', 60000), // very long-lived, dismissed manually
        dismiss: (id) => dismissToast(id),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            {/* Toast Container */}
            <div className="fixed top-4 right-4 left-4 z-[100] flex flex-col items-center gap-2 pointer-events-none max-w-md mx-auto">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto w-full flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg animate-toast-in ${COLORS[t.type]}`}
                    >
                        <span className="material-icons text-xl">{ICONS[t.type]}</span>
                        <span className="text-sm font-medium flex-1">{t.message}</span>
                        <button
                            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                            className="opacity-60 hover:opacity-100 transition-opacity"
                        >
                            <span className="material-icons text-sm">close</span>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
