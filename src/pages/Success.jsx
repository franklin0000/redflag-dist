
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Success() {
    const navigate = useNavigate();

    const handleDownloadReceipt = () => {
        const date = new Date().toLocaleDateString();
        const orderId = `RF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const receiptContent = `
RED FLAG - PAYMENT RECEIPT
--------------------------------
Order ID:       ${orderId}
Date:           ${date}
Status:         PAID

Item:           Premium Subscription (Monthly)
Amount:         $10.99
Payment Method: Card ending in 4242

--------------------------------
Thank you for securing your dating life!
RedFlag
        `.trim();

        const blob = new Blob([receiptContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `RedFlag_Receipt_${Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display min-h-screen flex flex-col justify-between items-center relative overflow-hidden text-slate-800 dark:text-white p-6">
            {/* Abstract Background Pattern */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-20 dark:opacity-10">
                <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary rounded-full blur-[100px] opacity-40"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-primary/40 rounded-full blur-[80px] opacity-30"></div>
            </div>

            {/* Main Content Container */}
            <div className="w-full max-w-md flex flex-col items-center justify-center flex-grow z-10 pt-10">
                {/* Animated Icon Area */}
                <div className="mb-8 relative">
                    <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full border border-primary/20 animate-pulse"></div>
                        <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="material-icons text-5xl text-primary">check</span>
                        </div>
                    </div>
                </div>

                {/* Success Message */}
                <div className="text-center space-y-3 mb-10">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome to Premium!</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
                        Your account is now active. <br />Start uncovering red flags safely.
                    </p>
                </div>

                {/* Transaction Receipt Card */}
                <div className="w-full bg-white dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-xl p-6 shadow-xl mb-8">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-6 border-b border-slate-100 dark:border-white/5 pb-2">Transaction Summary</h3>
                    <div className="space-y-5">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Amount</span>
                            <span className="text-xl font-bold text-slate-900 dark:text-white">$10.99</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Payment Method</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Card ending in 4242</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex justify-center">
                        <button
                            onClick={handleDownloadReceipt}
                            className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm font-medium"
                        >
                            <span className="material-icons text-sm">receipt_long</span>
                            Download Receipt
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="w-full max-w-md z-10 pb-6">
                <button onClick={() => navigate('/results')} className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-lg py-4 px-6 rounded-xl shadow-[0_0_20px_-5px_rgba(19,236,91,0.4)] transition-all transform active:scale-[0.98] mb-4">
                    Return to Results
                </button>
                <button onClick={() => navigate('/')} className="w-full py-3 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm font-medium transition-colors">
                    Return to Home
                </button>
            </div>
        </div>
    );
}
