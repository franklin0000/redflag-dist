import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';

const PROXY_WALLET = import.meta.env.VITE_PROXY_WALLET_ADDRESS || '0x4Bb924F138b20ED83ba2dE659A4cFBee5745CB38';
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const API_BASE = import.meta.env.VITE_API_URL || '';

const erc20Abi = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
];

const STEPS = { IDLE: 0, SIGNING: 1, CONFIRMING: 2, EXECUTING: 3, DONE: 4, ERROR: 5 };

export default function TradeModal({ market, yesPrice, noPrice, initialSide, onClose }) {
  const { address, isConnected } = useAccount();
  const [outcome, setOutcome] = useState(initialSide || 'YES');
  const [side, setSide] = useState('BUY');
  const [size, setSize] = useState(10);
  const [step, setStep] = useState(STEPS.IDLE);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultHash, setResultHash] = useState('');

  const activePrice = outcome === 'YES' ? yesPrice : noPrice;
  const totalCost = parseFloat((size * activePrice).toFixed(4));
  const feeAmount = parseFloat((totalCost * 0.015).toFixed(4));
  const potentialReturn = parseFloat((size * 1).toFixed(2));
  const potentialProfit = parseFloat((potentialReturn - totalCost).toFixed(2));

  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // wallet submitted → now waiting for confirmation
  useEffect(() => {
    if (txHash && step === STEPS.SIGNING) {
      setStep(STEPS.CONFIRMING);
    }
  }, [txHash]);

  // block confirmed → call backend
  useEffect(() => {
    if (isConfirmed && txHash && step === STEPS.CONFIRMING) {
      setStep(STEPS.EXECUTING);
      callBackend(txHash);
    }
  }, [isConfirmed, txHash]);

  const callBackend = async (hash) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('rf_token');
      const res = await fetch(`${API_BASE}/api/polymarket/proxy-trade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tokenId: outcome === 'NO' ? market?.noTokenId : market?.tokenId,
          price: activePrice,
          size: size,
          side: side,
          txHash: hash,
          userAddress: address,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Trade failed');
      setResultHash(data.orderId || data.hash || hash);
      setStep(STEPS.DONE);
    } catch (err) {
      setErrorMsg(err.message);
      setStep(STEPS.ERROR);
    }
  };

  const handleTrade = () => {
    if (!isConnected || !address) {
      setErrorMsg('Connect your wallet first.');
      return;
    }
    if (size <= 0 || totalCost <= 0) {
      setErrorMsg('Enter a valid number of shares.');
      return;
    }
    setErrorMsg('');
    setStep(STEPS.SIGNING);

    try {
      const usdcAmt = parseUnits(totalCost.toFixed(6), 6);
      writeContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [PROXY_WALLET, usdcAmt],
      });
    } catch (err) {
      setErrorMsg(err.message);
      setStep(STEPS.IDLE);
    }
  };

  const stepLabels = ['', 'Waiting for wallet signature...', 'Waiting for block confirmation...', 'Submitting order to Polymarket...', '', ''];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="bg-[#15161a] border border-white/10 rounded-t-3xl md:rounded-3xl w-full max-w-md p-6 relative shadow-2xl"
        >
          {/* drag handle */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6 md:hidden" />

          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <span className="material-icons text-sm text-gray-400">close</span>
          </button>

          <h2 className="text-xl font-black mb-1">Trade</h2>
          <p className="text-gray-500 text-xs mb-5 pr-8 line-clamp-2 leading-tight">
            {market?.title}
          </p>

          {/* YES / NO */}
          <div className="flex gap-2 mb-4">
            {['YES', 'NO'].map(o => {
              const price = o === 'YES' ? yesPrice : noPrice;
              const isActive = outcome === o;
              return (
                <button
                  key={o}
                  onClick={() => setOutcome(o)}
                  className={`flex-1 py-3 rounded-xl font-black text-lg transition-all border ${
                    isActive && o === 'YES' ? 'bg-green-500/15 border-green-500/40 text-green-400'
                    : isActive && o === 'NO' ? 'bg-red-500/15 border-red-500/40 text-red-400'
                    : 'bg-white/[0.03] border-white/5 text-gray-500 hover:border-white/10'
                  }`}
                >
                  {o} <span className="text-sm font-medium">{Math.round(price * 100)}¢</span>
                </button>
              );
            })}
          </div>

          {/* BUY / SELL */}
          <div className="flex gap-1 bg-black/30 p-1 rounded-xl mb-5">
            {['BUY', 'SELL'].map(s => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  side === s ? 'bg-white/10 text-white shadow' : 'text-gray-500 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Share count */}
          <div className="mb-5">
            <label className="block text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">
              Number of Shares
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSize(s => Math.max(1, s - 10))}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 font-black transition-colors"
              >−</button>
              <input
                type="number"
                min="1"
                value={size}
                onChange={e => setSize(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white text-center font-black text-lg outline-none focus:border-pink-500/50"
              />
              <button
                onClick={() => setSize(s => s + 10)}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 font-black transition-colors"
              >+</button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-black/20 border border-white/5 rounded-2xl p-4 mb-5 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Price per share</span>
              <span className="text-white font-bold">{(activePrice * 100).toFixed(1)}¢</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total cost</span>
              <span className="text-white font-bold">${totalCost.toFixed(2)} USDC</span>
            </div>
            {side === 'BUY' && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">If {outcome} wins (max return)</span>
                <span className={`font-bold ${potentialProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  +${potentialProfit.toFixed(2)}
                </span>
              </div>
            )}
            <div className="border-t border-white/5 pt-2 flex justify-between text-xs text-yellow-500/70">
              <span>Platform fee (included)</span>
              <span>1.5% ({feeAmount.toFixed(3)} USDC)</span>
            </div>
          </div>

          {/* Step indicator */}
          {step > STEPS.IDLE && step < STEPS.DONE && step !== STEPS.ERROR && (
            <div className="mb-4 flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-xl p-3">
              <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="text-sm text-gray-300">{stepLabels[step]}</span>
            </div>
          )}

          {/* Error */}
          {(errorMsg || step === STEPS.ERROR) && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm flex items-start gap-2">
              <span className="material-icons text-sm mt-0.5 flex-shrink-0">error_outline</span>
              {errorMsg || 'Trade failed. Please try again.'}
            </div>
          )}

          {/* Success */}
          {step === STEPS.DONE && (
            <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-400 font-black text-sm mb-1">
                <span className="material-icons text-base">check_circle</span> Trade Executed!
              </div>
              {resultHash && (
                <p className="text-xs text-gray-500 font-mono break-all">Order: {resultHash}</p>
              )}
            </div>
          )}

          {/* Main CTA */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={step === STEPS.DONE || step === STEPS.ERROR ? onClose : handleTrade}
            disabled={step > STEPS.IDLE && step < STEPS.DONE && step !== STEPS.ERROR}
            className={`w-full py-4 rounded-2xl font-black text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              step === STEPS.DONE || step === STEPS.ERROR
                ? 'bg-white/10 text-white'
                : outcome === 'YES'
                ? 'bg-green-500 hover:bg-green-400 text-black shadow-lg shadow-green-500/20'
                : 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/20'
            }`}
          >
            {step === STEPS.DONE ? '✓ Done'
              : step === STEPS.ERROR ? 'Close'
              : step > STEPS.IDLE ? 'Processing...'
              : `${side} ${outcome} — $${totalCost.toFixed(2)} USDC`}
          </motion.button>

          {!isConnected && step === STEPS.IDLE && (
            <p className="text-center text-xs text-yellow-500/80 mt-3">
              ⚠️ Connect your wallet to trade on Polygon
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
