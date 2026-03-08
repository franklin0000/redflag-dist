import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;

const PLANS = [
    {
        id: 'monthly',
        name: 'Premium Monthly',
        price: '3.99',
        period: '/month',
        features: ['Unlimited searches', 'Facial scan', 'Dating Mode', 'Priority support'],
        badge: null,
    },
    {
        id: 'annual',
        name: 'Premium Annual',
        price: '47.88',
        period: '/year',
        features: ['Everything in Monthly', 'Save 33%', 'Early access to features', 'Exclusive badge'],
        badge: 'Best Value',
    },
];

// Load PayPal SDK dynamically
function loadPayPalScript(clientId) {
    return new Promise((resolve, reject) => {
        if (document.getElementById('paypal-sdk')) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.id = 'paypal-sdk';
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
        document.body.appendChild(script);
    });
}

export default function Subscribe() {
    const navigate = useNavigate();
    const { updateSubscription } = useAuth();
    const toast = useToast();
    const [selectedPlan, setSelectedPlan] = useState('monthly');
    const [sdkReady, setSdkReady] = useState(false);
    const [sdkError, setSdkError] = useState(false);
    const [processing, setProcessing] = useState(false);
    const paypalRef = useRef(null);
    const buttonsRendered = useRef(false);

    // Load PayPal SDK on mount
    useEffect(() => {
        if (!PAYPAL_CLIENT_ID) {
            setSdkError(true);
            return;
        }
        loadPayPalScript(PAYPAL_CLIENT_ID)
            .then(() => setSdkReady(true))
            .catch(() => setSdkError(true));
    }, []);

    // Render/re-render PayPal buttons when SDK is ready or plan changes
    useEffect(() => {
        if (!sdkReady || !window.paypal || !paypalRef.current) return;

        let mounted = true;

        // Clear old buttons
        paypalRef.current.innerHTML = '';
        buttonsRendered.current = false;

        const currentPlan = PLANS.find(p => p.id === selectedPlan);

        try {
            window.paypal.Buttons({
                style: {
                    layout: 'vertical',
                    color: 'gold',
                    shape: 'pill',
                    label: 'subscribe',
                    height: 50,
                },

                // Create order with selected plan amount
                createOrder: (data, actions) => {
                    return actions.order.create({
                        purchase_units: [{
                            description: `RedFlag ${currentPlan.name}`,
                            amount: {
                                currency_code: 'USD',
                                value: currentPlan.price,
                            },
                        }],
                        application_context: {
                            brand_name: 'RedFlag',
                            shipping_preference: 'NO_SHIPPING',
                        },
                    });
                },

                // Handle successful payment
                onApprove: async (data, actions) => {
                    if (!mounted) return;
                    setProcessing(true);
                    try {
                        const order = await actions.order.capture();
                        console.log('✅ PayPal payment captured:', order);

                        if (!mounted) return;

                        // Update user subscription status
                        if (updateSubscription) {
                            await updateSubscription('paid');
                        }

                        if (mounted) {
                            toast.success('🎉 Payment successful! Welcome to Premium!');
                            navigate('/success');
                        }
                    } catch (err) {
                        console.error('Payment capture error:', err);
                        if (mounted) toast.error('Payment failed. Please try again.');
                    } finally {
                        if (mounted) setProcessing(false);
                    }
                },

                // Handle cancellation
                onCancel: () => {
                    toast.info('Payment cancelled. You can try again anytime.');
                },

                // Handle errors
                onError: (err) => {
                    console.error('PayPal error:', err);
                    toast.error('Something went wrong with PayPal. Please try again.');
                },
            }).render(paypalRef.current).then(() => {
                buttonsRendered.current = true;
            });
        } catch (err) {
            console.error('PayPal buttons render error:', err);
        }

        return () => { mounted = false; };
    }, [sdkReady, selectedPlan, navigate, toast, updateSubscription]);

    const handleSkip = () => {
        toast.info('You can upgrade anytime from Settings.');
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark font-display relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-15%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-500/15 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 mb-4 shadow-lg shadow-primary/30">
                        <span className="material-icons text-white text-3xl">diamond</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Choose Your Plan</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Unlock the full RedFlag experience</p>
                </div>

                {/* Plan Cards */}
                <div className="space-y-3 mb-8">
                    {PLANS.map((plan) => (
                        <button
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan.id)}
                            className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-300 relative overflow-hidden ${selectedPlan === plan.id
                                ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-lg shadow-primary/10'
                                : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/20'
                                }`}
                        >
                            {plan.badge && (
                                <span className="absolute top-3 right-3 px-2.5 py-1 bg-gradient-to-r from-primary to-purple-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                                    {plan.badge}
                                </span>
                            )}
                            <div className="flex items-baseline gap-1 mb-2 ml-8">
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">${plan.price}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{plan.period}</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 ml-8">{plan.name}</p>
                            <div className="flex flex-wrap gap-2 ml-8">
                                {plan.features.map((f, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <span className="material-icons text-primary text-sm">check_circle</span>
                                        {f}
                                    </span>
                                ))}
                            </div>
                            {/* Selection indicator */}
                            <div className={`absolute top-5 left-5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedPlan === plan.id ? 'border-primary bg-primary' : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                {selectedPlan === plan.id && (
                                    <span className="material-icons text-white text-xs">check</span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                {/* PayPal Payment Section */}
                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 mb-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="material-icons text-primary text-lg">payment</span>
                        Secure Payment via PayPal
                    </h3>

                    {processing && (
                        <div className="flex items-center justify-center py-6 gap-3">
                            <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">Processing payment...</span>
                        </div>
                    )}

                    {sdkError && (
                        <div className="text-center py-6">
                            <span className="material-icons text-red-500 text-3xl mb-2">error_outline</span>
                            <p className="text-sm text-red-500">Failed to load PayPal. Please refresh and try again.</p>
                        </div>
                    )}

                    {!sdkReady && !sdkError && (
                        <div className="flex items-center justify-center py-8 gap-3">
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm text-gray-400">Loading PayPal...</span>
                        </div>
                    )}

                    {/* PayPal buttons will render here */}
                    <div
                        ref={paypalRef}
                        className={`${processing ? 'hidden' : ''} min-h-[50px]`}
                    ></div>

                    <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
                        <span className="material-icons text-sm text-green-500">lock</span>
                        Secured by PayPal • 7-day free trial • Cancel anytime
                    </div>
                </div>

                {/* Skip */}
                <button
                    onClick={handleSkip}
                    className="w-full mt-2 py-3 border border-gray-300 dark:border-white/20 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 text-sm font-semibold transition-colors"
                >
                    Continue with free version →
                </button>

                {/* Legal */}
                <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-4 leading-relaxed">
                    By subscribing, you agree to our Terms of Service and Privacy Policy.
                    Cancel anytime. No charges during your 7-day trial.
                </p>
            </div>
        </div>
    );
}
