
import React, { useState } from 'react';

export default function DateFeedback({ isOpen, onClose, matchName }) {
    const [safetyRating, setSafetyRating] = useState(0);
    const [placeRating, setPlaceRating] = useState(0);
    const [submitted, setSubmitted] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = () => {
        // Simulate submission
        setTimeout(() => {
            setSubmitted(true);
            setTimeout(() => {
                onClose();
                setSubmitted(false);
                setSafetyRating(0);
                setPlaceRating(0);
            }, 2000);
        }, 800);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden">

                {submitted ? (
                    <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-4">
                            <span className="material-icons text-4xl">check</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Feedback Sent!</h3>
                        <p className="text-center text-gray-500 dark:text-gray-400 mt-2 text-sm">Thanks for helping keep the community safe.</p>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                        >
                            <span className="material-icons">close</span>
                        </button>

                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Rate Your Date</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">with {matchName || 'Match'}</p>
                        </div>

                        <div className="space-y-6">
                            {/* Safety Rating */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Did you feel safe?
                                </label>
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            onClick={() => setSafetyRating(star)}
                                            className="transition-transform active:scale-90"
                                        >
                                            <span className={`material-icons text-3xl ${star <= safetyRating ? 'text-green-500' : 'text-gray-200 dark:text-gray-700'
                                                }`}>shield</span>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-center text-xs text-green-600 h-4 mt-1 font-medium">
                                    {safetyRating === 5 ? 'Very Safe' : safetyRating === 1 ? 'Unsafe' : ''}
                                </p>
                            </div>

                            {/* Place Rating */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    How was the location?
                                </label>
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            onClick={() => setPlaceRating(star)}
                                            className="transition-transform active:scale-90"
                                        >
                                            <span className={`material-icons text-3xl ${star <= placeRating ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-700'
                                                }`}>star</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={!safetyRating || !placeRating}
                                className={`w-full py-3 rounded-xl font-bold text-white transition-all ${safetyRating && placeRating
                                        ? 'bg-primary shadow-lg shadow-primary/30 hover:scale-[1.02]'
                                        : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                                    }`}
                            >
                                Submit Feedback
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
