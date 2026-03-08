import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { safeRideService } from '../services/safeRideService';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAPBOX_STYLE = "mapbox://styles/mapbox/dark-v11";
export default function SafeRideTracker() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useToast();

    const [ride, setRide] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pickupInput, setPickupInput] = useState('');
    const [viewState, setViewState] = useState({
        longitude: -74.0060,
        latitude: 40.7128,
        zoom: 14
    });

    // Map refs
    const mapRef = useRef(null);

    // Load initial data
    useEffect(() => {
        let isMounted = true;

        const fetchRide = async () => {
            try {
                const data = await safeRideService.getRide(sessionId);
                if (isMounted) {
                    setRide(data);
                }
            } catch (error) {
                console.error("Error fetching saferide:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchRide();

        // Subscribe to real-time updates for this session
        const unsubscribe = safeRideService.subscribeToRide(sessionId, (updatedRide) => {
            if (isMounted) {
                setRide(updatedRide);
                if (updatedRide.status === 'arrived') {
                    toast.success("SafeRide has arrived at the pickup location!");
                }
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [sessionId, toast]);

    const isSender = ride?.sender_id === user?.id;

    // Auto fit bounds when ride updates
    useEffect(() => {
        if (!ride || !mapRef.current) return;

        // Simple bounding box logic
        let minLng = Math.min(ride.dest_lng, ride.car_lng || ride.dest_lng);
        let maxLng = Math.max(ride.dest_lng, ride.car_lng || ride.dest_lng);
        let minLat = Math.min(ride.dest_lat, ride.car_lat || ride.dest_lat);
        let maxLat = Math.max(ride.dest_lat, ride.car_lat || ride.dest_lat);

        if (!isSender && ride.pickup_lat && ride.pickup_lng) {
            minLng = Math.min(minLng, ride.pickup_lng);
            maxLng = Math.max(maxLng, ride.pickup_lng);
            minLat = Math.min(minLat, ride.pickup_lat);
            maxLat = Math.max(maxLat, ride.pickup_lat);
        }

        // Add some padding to the bounds
        const lngPadding = (maxLng - minLng) * 0.1 || 0.01;
        const latPadding = (maxLat - minLat) * 0.1 || 0.01;

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
    }, [ride, isSender]);

    const [isConnectingUber, setIsConnectingUber] = useState(false);

    // Check if sender already connected Uber (e.g. after returning from OAuth)
    useEffect(() => {
        if (!isSender || ride?.status !== 'requested') return;

        safeRideService.isUberConnected().then(setIsConnectingUber);
    }, [isSender, ride?.status]);

    // Car movement simulation removed. Real-time updates are driven purely
    // by Supabase realtime subscription which listens to our webhook edge function updates.

    const handleAcceptRide = async (e) => {
        e.preventDefault();
        try {
            // Geocode the fake pickup using Mapbox instead of Google Maps
            toast.info("Finding pickup location...");

            const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(pickupInput)}.json?access_token=${mapboxToken}&limit=1`;

            const response = await fetch(url);
            if (!response.ok) throw new Error("Geocoding failed");

            const data = await response.json();

            if (data.features && data.features.length > 0) {
                const feature = data.features[0];
                const lat = feature.center[1];
                const lng = feature.center[0];

                toast.info("Requesting Uber...");

                try {
                    await safeRideService.acceptRide(sessionId, feature.place_name || pickupInput, lat, lng);
                    toast.success("Uber is on the way!");
                } catch (err) {
                    console.error("Uber Accept Error:", err);
                    toast.error("Failed to connect to Uber API");
                }
            } else {
                toast.error("Could not find that address");
            }
        } catch (err) {
            toast.error("Failed to accept ride");
            console.error(err);
        }
    };

    const handleConnectUber = () => {
        // In production, redirect to Uber OAuth. In dev (no client ID), stay on page
        // and simulate the connected state so the UI can be tested end-to-end.
        if (import.meta.env.VITE_UBER_CLIENT_ID) {
            setIsConnectingUber(true);
            window.location.href = safeRideService.getUberAuthUrl(user.id);
        } else {
            toast.info("Connecting to Uber (Simulated)...");
            setTimeout(() => {
                toast.success("Uber Connected! (Simulation Mode)");
                setIsConnectingUber(true);
            }, 1500);
        }
    };

    if (loading) return <div className="h-screen bg-gray-900 text-white flex items-center justify-center">Loading SafeRide...</div>;
    if (!ride) return <div className="h-screen bg-gray-900 text-white flex items-center justify-center">Ride not found</div>;

    const showPickupForm = !isSender && ride.status === 'requested';
    const showWaiting = isSender && ride.status === 'requested';

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white relative">
            {/* Header Overlay */}
            <div className="absolute top-0 inset-x-0 z-10 bg-gradient-to-b from-gray-900 to-transparent p-4 flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md">
                    <span className="material-icons text-white">arrow_back</span>
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xl font-bold tracking-widest text-white flex items-center gap-2">
                        <span className="material-icons text-blue-400">local_taxi</span>
                        SAFERIDE
                    </h1>
                    <p className="text-xs text-gray-400">Uber Business Integrated</p>
                </div>
                <div className="w-10"></div>
            </div>

            {/* Google Map Container or Form Area */}
            {showPickupForm ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black z-20">
                    <div className="bg-gray-800 p-8 rounded-3xl w-full max-w-sm shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-gray-700">
                        <h2 className="text-2xl font-bold text-center mb-2">Accept SafeRide</h2>
                        <p className="text-sm text-gray-400 text-center mb-6">Your match paid for your ride! Enter your pickup location. <strong className="text-red-400">Your match will NEVER see this address.</strong></p>

                        <form onSubmit={handleAcceptRide} className="flex flex-col gap-4">
                            <div>
                                <label className="text-xs text-gray-400 font-bold ml-1 mb-1 block">Pickup Address</label>
                                <input
                                    type="text"
                                    value={pickupInput}
                                    onChange={(e) => setPickupInput(e.target.value)}
                                    placeholder="e.g. 123 Main St, Apt 4B"
                                    className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl mt-2 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-icons">directions_car</span> Dispatch Driver
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
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
                            {/* Destination Marker */}
                            {ride && ride.dest_lat && ride.dest_lng && (
                                <Marker longitude={ride.dest_lng} latitude={ride.dest_lat} anchor="bottom">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
                                        <path fill="#f59e0b" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                    </svg>
                                </Marker>
                            )}

                            {/* Pickup Marker (Only for receiver) */}
                            {ride && !isSender && ride.pickup_lat && ride.pickup_lng && (
                                <Marker longitude={ride.pickup_lng} latitude={ride.pickup_lat} anchor="center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="8" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
                                    </svg>
                                </Marker>
                            )}

                            {/* Car Marker */}
                            {ride && ride.status === 'en_route' && ride.car_lat && ride.car_lng && (
                                <Marker longitude={ride.car_lng} latitude={ride.car_lat} anchor="center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
                                        <path fill="#fff" d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                                    </svg>
                                </Marker>
                            )}
                        </Map>
                    )}
                </div>
            )}

            {/* Bottom Status Panel */}
            <div className="absolute bottom-0 inset-x-0 z-10 bg-gray-900 border-t border-gray-800 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] p-6 pb-8">

                {showWaiting && (
                    <div className="text-center">
                        {!isConnectingUber ? (
                            <>
                                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700">
                                    <span className="material-icons text-white text-3xl">local_taxi</span>
                                </div>
                                <h3 className="font-bold text-lg mb-2">Connect Your Uber Account</h3>
                                <p className="text-gray-400 text-sm mb-6">Link your Uber account so your match can dispatch a ride home.</p>
                                <button
                                    onClick={handleConnectUber}
                                    className="bg-white text-black font-bold py-3 px-8 rounded-full hover:bg-gray-200 transition-colors"
                                >
                                    Connect Uber
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-400/50">
                                    <span className="material-icons text-blue-400 text-3xl">check</span>
                                </div>
                                <h3 className="font-bold text-lg text-blue-400 mb-4">Uber Connected!</h3>

                                <div className="w-8 h-8 border-4 border-gray-600 border-t-gray-300 rounded-full animate-spin mx-auto mb-2"></div>
                                <p className="text-gray-400 text-sm">Waiting for your match to securely enter their pickup location...</p>
                            </>
                        )}
                    </div>
                )}

                {ride.status === 'en_route' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-xl">{ride.eta_minutes} min away</h3>
                                <p className="text-gray-400 text-sm">Heading to {ride.dest_name}</p>
                            </div>
                            <div className="text-right">
                                <span className="bg-blue-900/50 text-blue-400 font-bold px-3 py-1 rounded-full text-sm border border-blue-500/30">
                                    {ride.license_plate}
                                </span>
                                <p className="text-xs font-bold text-gray-500 mt-1">{ride.car_model}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-gray-800 p-4 rounded-2xl">
                            <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                                <span className="material-icons text-gray-400 text-2xl">person</span>
                            </div>
                            <div>
                                <p className="font-bold">{ride.driver_name}</p>
                                <div className="flex items-center gap-1 text-yellow-400 text-xs mt-1">
                                    <span className="material-icons text-sm">star</span>
                                    4.9 Rating
                                </div>
                            </div>
                            <button className="ml-auto bg-gray-700 hover:bg-gray-600 w-10 h-10 rounded-full flex items-center justify-center transition-colors">
                                <span className="material-icons text-sm">call</span>
                            </button>
                        </div>
                    </div>
                )}

                {ride.status === 'arrived' && (
                    <div className="text-center py-4">
                        <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-icons text-green-400 text-3xl">done_all</span>
                        </div>
                        <h3 className="font-bold text-xl text-green-400">Driver Arrived</h3>
                        <p className="text-gray-400 text-sm mt-1">The date begins at {ride.dest_name}!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
