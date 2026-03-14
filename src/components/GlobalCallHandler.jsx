import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSocket, connectSocket } from '../services/socketService';

const RING_TIMEOUT_MS = 30000; // Auto-dismiss after 30 s

export default function GlobalCallHandler() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [incomingCall, setIncomingCall] = useState(null); // { matchId, signal, from, callType }
  const timerRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;

    const s = getSocket() || connectSocket();

    const handleSignal = (payload) => {
      const { signal, from, type, callType, matchId } = payload;
      if (type !== 'offer') return;
      if (from === user.id) return; // own signal bounced back

      // If already on the DatingChat for this match, DatingChat handles it
      const chatPath = `/dating/chat/${from}`;
      if (location.pathname === chatPath) return;

      setIncomingCall({ matchId, signal, from, callType });

      // Auto-dismiss after timeout
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIncomingCall(null);
        s.emit('call:end', { matchId });
      }, RING_TIMEOUT_MS);
    };

    s.on('call:signal', handleSignal);
    return () => {
      s.off('call:signal', handleSignal);
      clearTimeout(timerRef.current);
    };
  }, [user?.id, location.pathname]);

  if (!incomingCall) return null;

  const handleAccept = () => {
    clearTimeout(timerRef.current);
    const { from, matchId, signal, callType } = incomingCall;
    setIncomingCall(null);
    // Navigate to the chat; pass the offer signal via location state so DatingChat
    // can answer without waiting for a second socket event.
    navigate(`/dating/chat/${from}`, {
      state: { autoAnswerCall: { signal, matchId, callType } },
    });
  };

  const handleDecline = () => {
    clearTimeout(timerRef.current);
    const s = getSocket();
    if (s) s.emit('call:end', { matchId: incomingCall.matchId });
    setIncomingCall(null);
  };

  const isVideo = incomingCall.callType === 'video';

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center pb-12 px-6 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-sm bg-gray-900/95 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 flex flex-col items-center gap-5 animate-[fadeInUp_0.3s_ease]">
        {/* Pulsing avatar */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/40 animate-pulse">
            <span className="material-icons text-4xl text-white">person</span>
          </div>
          <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-2 border-gray-900 flex items-center justify-center">
            <span className="material-icons text-sm text-white">{isVideo ? 'videocam' : 'call'}</span>
          </span>
        </div>

        <div className="text-center">
          <p className="text-white font-bold text-lg">Incoming {isVideo ? 'Video' : 'Audio'} Call</p>
          <p className="text-gray-400 text-sm mt-1">End-to-End Encrypted</p>
        </div>

        <div className="flex gap-8">
          {/* Decline */}
          <button
            onClick={handleDecline}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/50 hover:bg-red-500 active:scale-95 transition-all">
              <span className="material-icons text-3xl text-white">call_end</span>
            </div>
            <span className="text-xs text-gray-400 font-medium">Decline</span>
          </button>

          {/* Accept */}
          <button
            onClick={handleAccept}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-900/50 hover:bg-green-400 active:scale-95 transition-all">
              <span className="material-icons text-3xl text-white">{isVideo ? 'videocam' : 'call'}</span>
            </div>
            <span className="text-xs text-gray-400 font-medium">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}
