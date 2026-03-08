
import SimplePeer from 'simple-peer';
import { supabase } from './supabase';

/**
 * Call Service
 * Handles WebRTC signaling via Supabase Realtime
 */

// Global state to track active calls (singleton pattern for simplicity)
let activePeer = null;
// let activeCallType = null; // 'video' or 'audio' - unused
let localStream = null;

export const callService = {
    /**
     * Start a call
     * @param {string} matchId - The ID of the conversation/match
     * @param {string} userId - Current user ID
     * @param {string} type - 'video' or 'audio'
     * @param {function} onStream - Callback when remote stream is received
     * @param {function} onSignal - Callback to send signal data (handled internally but exposed if needed)
     */
    initiateCall: async (matchId, userId, type, onStream, onClose) => {


        // 1. Get Local Stream
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: type === 'video',
                audio: true
            });
            localStream = stream;

            // 2. Create Peer (Initiator)
            const peer = new SimplePeer({
                initiator: true,
                trickle: false,
                stream: stream
            });

            activePeer = peer;

            peer.on('signal', data => {
                // Send Offer via Supabase
                supabase.channel(`call:${matchId}`).send({
                    type: 'broadcast',
                    event: 'signal',
                    payload: { signal: data, from: userId, type: 'offer', callType: type }
                });
            });

            peer.on('stream', remoteStream => {
                if (onStream) onStream(remoteStream);
            });

            peer.on('close', () => {
                cleanupCall();
                if (onClose) onClose();
            });

            peer.on('error', err => {
                console.error('Peer error:', err);
                cleanupCall();
                if (onClose) onClose();
            });

            return { peer, localStream: stream };

        } catch (err) {
            console.error("Error getting media:", err);
            throw err;
        }
    },

    /**
     * Answer a call
     * @param {string} matchId 
     * @param {string} userId 
     * @param {object} offerSignal - The signal data from the offer
     * @param {string} type - 'video' or 'audio'
     * @param {function} onStream 
     */
    answerCall: async (matchId, userId, offerSignal, type, onStream, onClose) => {


        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: type === 'video',
                audio: true
            });
            localStream = stream;

            const peer = new SimplePeer({
                initiator: false,
                trickle: false,
                stream: stream
            });

            activePeer = peer;

            peer.on('signal', data => {
                // Send Answer via Supabase
                supabase.channel(`call:${matchId}`).send({
                    type: 'broadcast',
                    event: 'signal',
                    payload: { signal: data, from: userId, type: 'answer' }
                });
            });

            peer.on('stream', remoteStream => {
                if (onStream) onStream(remoteStream);
            });

            peer.on('close', () => {
                cleanupCall();
                if (onClose) onClose();
            });

            // Accept the offer
            peer.signal(offerSignal);

            return { peer, localStream: stream };

        } catch (err) {
            console.error("Error answering call:", err);
            throw err;
        }
    },

    /**
     * Handle incoming signal (for the initiator receiving the answer)
     */
    finalizeCall: (signalData) => {
        if (activePeer && !activePeer.destroyed) {
            activePeer.signal(signalData);
        }
    },

    /**
     * End current call
     */
    endCall: (matchId) => {
        if (activePeer) {
            activePeer.destroy();
        }
        cleanupCall();

        // Notify other peer
        if (matchId) {
            supabase.channel(`call:${matchId}`).send({
                type: 'broadcast',
                event: 'end_call',
                payload: {}
            });
        }
    },

    /**
     * Subscribe to call signals
     */
    subscribeToSignals: (matchId, userId, onIncomingCall, onAnswer, onEnd) => {
        const channel = supabase.channel(`call:${matchId}`)
            .on('broadcast', { event: 'signal' }, payload => {
                const { from, type, signal, callType } = payload.payload;
                if (from === userId) return; // Ignore own signals

                if (type === 'offer') {
                    onIncomingCall({ signal, from, callType });
                } else if (type === 'answer') {
                    onAnswer(signal);
                }
            })
            .on('broadcast', { event: 'end_call' }, () => {
                if (onEnd) onEnd();
                cleanupCall();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }
};

function cleanupCall() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    activePeer = null;

}
