import Video from 'twilio-video';
import { getToken } from './api';

/**
 * Advanced Twilio Video initialization for production environments.
 * Optimized for mobile networks and custom TURN server requirements.
 */
export async function connectToVideoRoom(roomName) {
    // 1. Get Token from backend
    // Assuming backend endpoint /api/twilio/token exists or needs to be created
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/twilio/token?room=${roomName}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
    });
    const { token, iceServers } = await response.json();

    // 2. Advanced Connection Options - Optimized for SPEED
    const connectOptions = {
        name: roomName,
        audio: true,
        video: { width: 640 },
        
        /**
         * STUN/TURN Optimization
         * Using Dynamic ICE servers from backend Network Traversal Service
         */
        iceServers: iceServers,
        iceTransportPolicy: 'all', // Try P2P first, then relay
        maxIceGatheringTimeout: 8000, // Reduced from 15s to 8s for faster startup
        
        // Speed up negotiation
        preferredVideoCodecs: [{ codec: 'VP8' }], // VP8 is fastest to initialize
        
        // Quality & Stability settings
        bandwidthProfile: {
            video: {
                mode: 'collaboration',
                dominantSpeakerPriority: 'high'
            }
        },
        maxAudioBitrate: 16000, 
        networkQuality: {
            local: 1,
            remote: 1
        }
    };

    // 3. Create the Room
    const room = await Video.connect(token, connectOptions);

    // 4. Handle Connection Events for Stability
    handleRoomEvents(room);

    return room;
}

function handleRoomEvents(room) {
    console.log(`Successfully joined room: ${room.name}`);

    // Critical for Mobile: Handle network handovers/drops
    room.on('reconnecting', (error) => {
        if (error.code === 53001) {
            console.log('Device offline. Waiting for network...');
        } else {
            console.log('Reconnecting to room...', error.message);
        }
    });

    room.on('reconnected', () => {
        console.log('Reconnected to the Room!');
    });

    room.on('disconnected', (room, error) => {
        if (error) {
            console.error('Disconnected due to error:', error.message);
        }
        // Cleanup local tracks
        room.localParticipant.tracks.forEach(publication => {
            publication.track.stop();
        });
    });

    // Monitor Network Quality
    room.localParticipant.on('networkQualityLevelChanged', (level) => {
        const quality = {
            0: 'Unknown',
            1: 'Very Poor',
            2: 'Poor',
            3: 'Fair',
            4: 'Good',
            5: 'Great'
        }[level];
        console.log(`Local Network Quality: ${quality}`);
        
        if (level <= 2) {
            // Recommendation: Disable video to prioritize audio on poor mobile networks
            console.warn('Network quality low. Switching to audio-only if needed.');
        }
    });
}
