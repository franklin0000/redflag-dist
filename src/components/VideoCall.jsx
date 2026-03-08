
import React, { useEffect, useRef, useState } from 'react';
import { callService } from '../services/callService';

export default function VideoCall({ matchId, userId, callType, incomingSignal, onEnd }) {
    const [stream, setStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [status, setStatus] = useState(incomingSignal ? 'Incoming Call...' : 'Calling...');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');

    const [error, setError] = useState(null);

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        let mounted = true;

        const startCall = async () => {
            try {
                if (incomingSignal) {
                    setStatus('Connecting...');
                    const { peer, localStream } = await callService.answerCall(
                        matchId,
                        userId,
                        incomingSignal.signal,
                        incomingSignal.callType || 'video',
                        (remote) => {
                            if (mounted) setRemoteStream(remote);
                        },
                        () => { if (mounted) onEnd(); }
                    );

                    if (mounted) {
                        setStream(localStream);
                        connectionRef.current = peer;
                        setStatus('Connected');
                    }
                } else {
                    setStatus('Calling...');
                    const { peer, localStream } = await callService.initiateCall(
                        matchId,
                        userId,
                        callType,
                        (remote) => {
                            if (mounted) {
                                setRemoteStream(remote);
                                setStatus('Connected');
                            }
                        },
                        () => { if (mounted) onEnd(); }
                    );

                    if (mounted) {
                        setStream(localStream);
                        connectionRef.current = peer;
                    }
                }
            } catch (err) {
                console.error("Call failed:", err);
                if (mounted) {
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        setError('Camera/microphone permission denied. Please allow access in your browser settings.');
                    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                        setError('No camera or microphone found on this device.');
                    } else if (err.name === 'NotReadableError') {
                        setError('Camera is already in use by another app.');
                    } else {
                        setError(err.message || 'Failed to start video call. Please try again.');
                    }
                    setStatus('Call Failed');
                }
            }
        };

        startCall();

        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Listen for Answer Signal (if initiator)
    useEffect(() => {
        if (!incomingSignal && connectionRef.current) {
            const unsubscribe = callService.subscribeToSignals(
                matchId,
                userId,
                () => { }, // Ignore new offers
                (signal) => {
                    callService.finalizeCall(signal);
                    setStatus('Connected');
                },
                onEnd
            );
            return () => unsubscribe();
        }
    }, [matchId, userId, incomingSignal, onEnd]);


    // Attach streams to video elements
    useEffect(() => {
        if (myVideo.current && stream) {
            myVideo.current.srcObject = stream;
        }
    }, [stream]);

    useEffect(() => {
        if (userVideo.current && remoteStream) {
            userVideo.current.srcObject = remoteStream;
        }
    }, [remoteStream]);


    const toggleMute = () => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = async () => {
        if (!stream) return;

        const existingTrack = stream.getVideoTracks()[0];

        if (existingTrack) {
            // Video track exists — just toggle it
            existingTrack.enabled = !existingTrack.enabled;
            setIsVideoOff(!existingTrack.enabled);
        } else {
            // No video track (audio-only call) — request camera
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const videoTrack = videoStream.getVideoTracks()[0];
                stream.addTrack(videoTrack);

                // Add track to peer connection so remote sees it
                if (connectionRef.current && !connectionRef.current.destroyed) {
                    connectionRef.current.addTrack(videoTrack, stream);
                }

                // Update local video display
                if (myVideo.current) {
                    myVideo.current.srcObject = stream;
                }
                setIsVideoOff(false);
            } catch (err) {
                console.error("Failed to enable camera:", err);
            }
        }
    };

    const handleEndCall = () => {
        callService.endCall(matchId);
        onEnd();
    };

    return (
        <div className="fixed inset-0 z-[70] bg-gray-900 flex flex-col items-center justify-center overflow-hidden">

            {/* Error Overlay */}
            {error && (
                <div className="absolute inset-0 z-[80] flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-md p-8">
                    <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
                        <span className="material-icons text-4xl text-red-400">videocam_off</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 text-center">Camera Error</h3>
                    <p className="text-sm text-gray-300 text-center max-w-xs mb-8 leading-relaxed">{error}</p>
                    <button
                        onClick={onEnd}
                        className="px-8 py-3 bg-white/10 text-white rounded-full font-semibold border border-white/20 hover:bg-white/20 transition-all active:scale-95"
                    >
                        Close
                    </button>
                </div>
            )}

            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-blue-900/40 pointer-events-none"></div>
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-600/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>

            {/* Remote Video (Full Screen) */}
            <div className="absolute inset-0 w-full h-full">
                {remoteStream ? (
                    <video
                        playsInline
                        muted={false}
                        ref={userVideo}
                        autoPlay
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900/90 backdrop-blur-md">
                        <div className="relative mb-8">
                            <div className="w-32 h-32 rounded-full border-4 border-purple-500/30 flex items-center justify-center animate-[spin_3s_linear_infinite]">
                                <div className="w-24 h-24 rounded-full border-t-4 border-pink-500 animate-[spin_2s_linear_infinite_reverse]"></div>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/50 animate-pulse">
                                    <span className="material-icons text-4xl text-white">person</span>
                                </div>
                            </div>
                        </div>
                        <h3 className="text-white text-2xl font-black tracking-tight animate-pulse bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                            {status}
                        </h3>
                        <p className="text-gray-400 mt-2 text-sm font-medium tracking-wide uppercase">End-to-End Encrypted</p>
                    </div>
                )}
            </div>

            {/* Local Video (PiP) - Floating Card */}
            <div className="absolute top-6 right-6 w-36 h-52 bg-gray-900/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 transition-transform hover:scale-105 duration-300 ring-1 ring-white/20">
                {stream && (
                    <video
                        playsInline
                        muted
                        ref={myVideo}
                        autoPlay
                        className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
                    />
                )}
                {isVideoOff && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/50 bg-gray-800">
                        <span className="material-icons text-3xl mb-1">videocam_off</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider">Camera Off</span>
                    </div>
                )}
            </div>

            {/* Controls Bar */}
            <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex items-center gap-6 px-8 py-5 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl ring-1 ring-white/5">
                <button
                    onClick={toggleMute}
                    className={`group relative p-4 rounded-full transition-all duration-300 ${isMuted ? 'bg-white text-gray-900 shadow-white/20' : 'bg-gray-800/50 text-white hover:bg-gray-700'}`}
                >
                    <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 blur-md`}></div>
                    <span className="material-icons relative z-10">{isMuted ? 'mic_off' : 'mic'}</span>
                </button>

                <button
                    onClick={handleEndCall}
                    className="group relative p-5 rounded-full bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg shadow-red-900/50 hover:scale-110 hover:rotate-90 transition-all duration-500"
                >
                    <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20"></div>
                    <span className="material-icons text-3xl relative z-10">call_end</span>
                </button>

                <button
                    onClick={toggleVideo}
                    className={`group relative p-4 rounded-full transition-all duration-300 ${isVideoOff ? 'bg-white text-gray-900 shadow-white/20' : 'bg-gray-800/50 text-white hover:bg-gray-700'}`}
                >
                    <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 blur-md`}></div>
                    <span className="material-icons relative z-10">{isVideoOff ? 'videocam_off' : 'videocam'}</span>
                </button>
            </div>
        </div>
    );
}
