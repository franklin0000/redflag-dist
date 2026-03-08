
import React from 'react';

const SvgLogo = () => (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path d="M50 5L90 25V55C90 75 50 95 50 95C50 95 10 75 10 55V25L50 5Z" className="fill-current text-gray-900 dark:text-white" opacity="0.1" />
        <path d="M50 10L85 28V53C85 70 50 88 50 88C50 88 15 70 15 53V28L50 10Z" className="fill-current text-white dark:text-gray-900" />
        <path d="M50 15L80 30V50C80 65 50 80 50 80C50 80 20 65 20 50V30L50 15Z" className="fill-primary" />
        <path d="M45 35L55 35L52 65H48L45 35Z" fill="white" />
        <circle cx="50" cy="72" r="3" fill="white" />
    </svg>
);

export default function Logo({ size = 'small', className = '' }) {
    // Fallback SVG if image generation fails or for faster loading

    // If we have a generated image, we would use it here. 
    // For now, we use a high-quality SVG shield to ensure it works immediately.
    // Replace <SvgLogo /> with <img src={generatedLogoUrl} /> once available.

    if (size === 'large') {
        return (
            <div className={`flex flex-col items-center gap-3 ${className}`}>
                <div className="w-24 h-24 drop-shadow-2xl">
                    <SvgLogo />
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                    RedFlag
                </h1>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="w-8 h-8 drop-shadow-lg">
                <SvgLogo />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                RedFlag
            </h1>
        </div>
    );
}
