import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * SubPageHeader — sticky top bar for detail pages.
 * Shows a back button on the left, a title in the center, and an optional right element.
 */
export default function SubPageHeader({ title, onBack, rightElement }) {
    const navigate = useNavigate();
    const handleBack = onBack || (() => navigate(-1));

    return (
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 h-14 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
            <button
                onClick={handleBack}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                aria-label="Regresar"
            >
                <span className="material-icons text-gray-700 dark:text-gray-200">chevron_left</span>
            </button>

            <h1 className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[60%] text-center">
                {title}
            </h1>

            <div className="w-10 flex justify-end">
                {rightElement || null}
            </div>
        </header>
    );
}
