import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDating } from '../context/DatingContext';
import { useToast } from '../context/ToastContext';
import { watchLocation, isGeolocationSupported } from '../services/locationService';
import { supabase } from '../services/supabase';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAPBOX_STYLE = "mapbox://styles/mapbox/dark-v11";

export default function LiveDateRadar() {
    const { matchId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { matches } = useDating();
    const toast = useToast();

    // Map container ref
    const mapRef = useRef(null);
    const stopWatchRef = useRef(null);

    const [locationError, setLocationError] = useState(null);
    const [viewState, setViewState] = useState({
        longitude: -74.0060,
        latitude: 40.7128,
        zoom: 14
    });

    const [myLoc, setMyLoc] = useState(null);
    const [matchLoc, setMatchLoc] = useState(null);

    // Find who we are sharing with
    // matchId is usually user.id_target.id sorted. So we need to find the target from context
    // The DatingContext matches list has the individual target user objects.
    // If we used the sorted matchId, targetUserId is the part that is NOT user.id
    const targetUserId = matchId.split('_').find(id => id !== user.id);
    const match = matches.find(m => m.id === targetUserId) || { name: 'Match' };

    // Bounds fitting effect
    useEffect(() => {
        if (!mapRef.current || !myLoc || !matchLoc) return;

        let minLng = Math.min(myLoc.lng, matchLoc.lng);
        let maxLng = Math.max(myLoc.lng, matchLoc.lng);
        let minLat = Math.min(myLoc.lat, matchLoc.lat);
        let maxLat = Math.max(myLoc.lat, matchLoc.lat);

        const lngPadding = (maxLng - minLng) * 0.2 || 0.01;
        const latPadding = (maxLat - minLat) * 0.2 || 0.01;

        try {
            mapRef.current.fitBounds(
                [
                    [minLng - lngPadding, minLat - latPadding],
                    [maxLng + lngPadding, maxLat + latPadding]
                ],
                { padding: 50, duration: 1000 }
            );
        } catch (e) {
            console.warn("Bounds fitting error:", e);
        }
    }, [myLoc, matchLoc]);

    // Send location to Supabase DB
    const updateMyTracking = async (coords) => {
        if (!user?.id || !matchId) return;

        // Upsert tracking data
        const { error } = await supabase.from('date_tracking').upsert({
            user_id: user.id,
            match_id: matchId,
            lat: coords.lat,
            lng: coords.lng,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,match_id' });

        if (error) {
            console.warn("Failed to update tracking info in DB:", error);
        }
    };

    // Start Location Sharing + realtime subscription (combined for clean deps)
    useEffect(() => {
        if (!isGeolocationSupported()) {
            setLocationError('GPS not supported in this browser');
            return;
        }

        toast.info("Radar scanning for your location...");

        stopWatchRef.current = watchLocation(
            (coords) => {
                setLocationError(null);
                setMyLoc(coords);
                setViewState(prev => ({ ...prev, latitude: coords.lat, longitude: coords.lng }));
                updateMyTracking(coords);
            },
            () => {
                setLocationError("GPS signal lost");
            }
        );

        // Subscribe to MATCH location updates
        let channel;
        if (targetUserId && matchId) {
            channel = supabase
                .channel(`tracking:${matchId}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'date_tracking', filter: `match_id=eq.${matchId}` },
                    (payload) => {
                        const row = payload.new;
                        if (row && row.user_id !== user?.id) {
                            setMatchLoc({ lat: row.lat, lng: row.lng });
                        }
                    }
                )
                .subscribe();
        }

        return () => {
            if (stopWatchRef.current) stopWatchRef.current();
            if (channel) supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetUserId, matchId, user?.id]);


    return (
        <div className="flex flex-col h-screen bg-black text-white relative">
            {/* Header Overlay */}
            <div className="absolute top-0 inset-x-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md">
                    <span className="material-icons text-white">close</span>
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xl font-bold tracking-widest text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)] flex items-center gap-2">
                        <span className="material-icons animate-spin-slow">radar</span>
                        LIVE RADAR
                    </h1>
                    <p className="text-xs text-gray-300">En route to date</p>
                </div>
                <div className="w-10"></div> {/* Spacer */}
            </div>

            {/* Mapbox Container */}
            <div className="flex-1 w-full relative">
                {!MAPBOX_TOKEN ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
                        <p>Mapbox Token Missing in .env</p>
                    </div>
                ) : (
                    <Map
                        ref={mapRef}
                        {...viewState}
                        onMove={evt => setViewState(evt.viewState)}
                        mapStyle={MAPBOX_STYLE}
                        mapboxAccessToken={MAPBOX_TOKEN}
                        style={{ width: '100%', height: '100%' }}
                    >
                        {/* My Marker */}
                        {myLoc && (
                            <Marker longitude={myLoc.lng} latitude={myLoc.lat} anchor="center">
                                <div className="relative flex items-center justify-center w-16 h-16">
                                    <div className="absolute inset-0 bg-emerald-500 rounded-full opacity-20 blur-xl animate-pulse"></div>
                                    <div className="w-4 h-4 bg-emerald-500 border-2 border-white rounded-full z-10 shadow-lg shadow-emerald-500/50"></div>
                                    <span className="absolute -top-4 text-[10px] font-bold text-white bg-emerald-600/80 px-2 py-0.5 rounded backdrop-blur-sm whitespace-nowrap">YOU</span>
                                </div>
                            </Marker>
                        )}

                        {/* Match Marker */}
                        {matchLoc && (
                            <Marker longitude={matchLoc.lng} latitude={matchLoc.lat} anchor="center">
                                <div className="relative flex items-center justify-center w-16 h-16">
                                    <div className="absolute inset-0 bg-purple-500 rounded-full opacity-20 blur-xl animate-pulse"></div>
                                    <div className="w-4 h-4 bg-purple-500 border-2 border-white rounded-full z-10 shadow-lg shadow-purple-500/50"></div>
                                    <span className="absolute -top-4 text-[10px] font-bold text-white bg-purple-600/80 px-2 py-0.5 rounded backdrop-blur-sm whitespace-nowrap">{match?.name?.substring(0, 6).toUpperCase() || 'MATCH'}</span>
                                </div>
                            </Marker>
                        )}
                    </Map>
                )}
            </div>

            {/* Bottom Panel Overlay */}
            <div className="absolute bottom-6 inset-x-4 z-10 flex flex-col gap-4">
                {/* Warning / Error */}
                {locationError && (
                    <div className="bg-red-900/80 border border-red-500 rounded-xl p-3 text-sm flex items-center gap-2 backdrop-blur-md">
                        <span className="material-icons text-red-400">warning</span>
                        <p>{locationError}</p>
                    </div>
                )}

                {/* Status Bar */}
                <div className="bg-gray-900/90 border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-lg flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full border-2 border-purple-500 overflow-hidden bg-gray-800 flex items-center justify-center">
                                {match?.photo ? (
                                    <img src={match.photo} alt={match.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="font-bold text-lg text-white">{match?.name?.charAt(0)}</span>
                                )}
                            </div>
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-black animate-pulse"></span>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{match?.name || 'Match'}</h3>
                            <p className="text-xs text-gray-400">Position updates in real-time</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
