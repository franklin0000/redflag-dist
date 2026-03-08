import { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
export default function LocationSearchModal({ isOpen, onClose, onLocationSelect }) {
    const [query, setQuery] = useState('');
    const [predictions, setPredictions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Use the existing Mapbox token from environment variables
    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

    // Reset state and close
    const handleClose = () => {
        setQuery('');
        setPredictions([]);
        onClose();
    };

    // Handle Search Input (debounced)
    useEffect(() => {
        if (!query.trim()) {
            setPredictions([]);
            return;
        }

        const fetchPredictions = async () => {
            if (!MAPBOX_TOKEN) {
                console.error("Mapbox token is missing!");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                // Use Mapbox Geocoding API to search for places/cities
                // types=place,region,country allows searching for cities, states, and countries
                const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?types=place,region,country&access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5`;

                const response = await fetch(url);
                if (!response.ok) throw new Error("Mapbox API Error");

                const data = await response.json();

                // Map the GeoJSON features to our prediction format
                if (data.features) {
                    const mappedPredictions = data.features.map(feature => ({
                        id: feature.id,
                        description: feature.place_name,
                        text: feature.text,
                        context: feature.context ? feature.context.map(c => c.text).join(', ') : '',
                        coordinates: feature.center // [lng, lat]
                    }));
                    setPredictions(mappedPredictions);
                } else {
                    setPredictions([]);
                }
            } catch (error) {
                console.error("Mapbox search error:", error);

                // Fallback Mock Data if network fails completely
                const mockCities = [
                    { id: 'mock_lon', description: 'London, United Kingdom', text: 'London', context: 'United Kingdom', coordinates: [-0.1278, 51.5074] },
                    { id: 'mock_ny', description: 'New York, NY, USA', text: 'New York', context: 'NY, USA', coordinates: [-74.0060, 40.7128] },
                    { id: 'mock_par', description: 'Paris, France', text: 'Paris', context: 'France', coordinates: [2.3522, 48.8566] },
                    { id: 'mock_tok', description: 'Tokyo, Japan', text: 'Tokyo', context: 'Japan', coordinates: [139.6503, 35.6762] },
                    { id: 'mock_syd', description: 'Sydney, Australia', text: 'Sydney', context: 'Australia', coordinates: [151.2093, -33.8688] },
                ].filter(c => c.description.toLowerCase().includes(query.toLowerCase()));

                setPredictions(query.length > 1 ? mockCities : []);
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchPredictions, 300); // Debounce HTTP requests
        return () => clearTimeout(timeoutId);
    }, [query, MAPBOX_TOKEN]);

    const handleSelectPlace = (prediction) => {
        // Mapbox returns coordinates as [lng, lat]
        const [lng, lat] = prediction.coordinates;

        // Use the main text (city name) for the display label
        const cityName = prediction.text;

        onLocationSelect(lat, lng, cityName);
        handleClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full sm:max-w-md h-[80vh] sm:h-[600px] bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-800"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="material-icons text-blue-500">flight_takeoff</span>
                                RedFlag Passport
                            </h3>
                            <button onClick={handleClose} className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full transition-colors">
                                <span className="material-icons">close</span>
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="p-4 bg-gray-900 border-b border-gray-800">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons text-gray-400">search</span>
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search a city, country..."
                                    className="w-full pl-12 pr-10 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
                                    autoFocus
                                />
                                {query && (
                                    <button
                                        onClick={() => setQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                                    >
                                        <span className="material-icons text-sm">cancel</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* List of Predictions */}
                        <div className="flex-1 overflow-y-auto bg-gray-900">
                            {isLoading && predictions.length === 0 && query && (
                                <div className="p-8 flex justify-center text-gray-400">
                                    <span className="material-icons animate-spin mr-2">refresh</span> Searching...
                                </div>
                            )}

                            {!isLoading && query && predictions.length === 0 && (
                                <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                                    <span className="material-icons text-4xl mb-2 text-gray-600">travel_explore</span>
                                    <p>No locations found.</p>
                                    <p className="text-xs mt-1">Try spelling the city differently.</p>
                                </div>
                            )}

                            {!query && (
                                <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                                    <span className="material-icons text-5xl mb-3 text-blue-500/30">public</span>
                                    <p className="font-medium text-gray-300">Where to next?</p>
                                    <p className="text-sm mt-2">Search any city worldwide to find matches there.</p>
                                </div>
                            )}

                            <ul className="divide-y divide-gray-800">
                                {predictions.map((pred) => (
                                    <li key={pred.id}>
                                        <button
                                            onClick={() => handleSelectPlace(pred)}
                                            className="w-full text-left p-4 hover:bg-gray-800 flex items-start gap-4 transition-colors"
                                        >
                                            <div className="mt-1 w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                                <span className="material-icons text-blue-500 text-[18px]">location_on</span>
                                            </div>
                                            <div>
                                                <p className="text-white font-medium text-base">
                                                    {pred.text}
                                                </p>
                                                <p className="text-sm text-gray-400">
                                                    {pred.context}
                                                </p>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
