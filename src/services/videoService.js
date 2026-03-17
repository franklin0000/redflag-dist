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
    const { token } = await response.json();

    // 2. Advanced Connection Options
    const connectOptions = {
        name: roomName,
        audio: true,
        video: { width: 640 },
        
        /**
         * CUSTOM TURN SERVERS CONFIGURATION
         * Crucial for mobile networks (4G/5G) where symmetric NAT often blocks P2P.
         */
        iceServers: [
            {
                urls: 'stun:global.stun.twilio.com:3478?transport=udp'
            },
            {
                urls: [
                    'turn:global.turn.twilio.com:3478?transport=udp',
                    'turn:global.turn.twilio.com:3478?transport=tcp',
                    'turn:global.turn.twilio.com:443?transport=tcp'
                ],
                username: 'your-twilio-username-or-token', // Backend usually provides this or uses twilio token
                credential: 'your-twilio-password'
            }
        ],
        
        // Quality & Stability settings
        bandwidthProfile: {
            video: {
                mode: 'collaboration',
                maxTracks: 10,
                dominantSpeakerPriority: 'high'
            }
        },
        maxAudioBitrate: 16000, // Optimize for mobile bandwidth
        networkQuality: {
            local: 1, // detail level
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
