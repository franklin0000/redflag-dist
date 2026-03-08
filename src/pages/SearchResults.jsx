
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { secureGet, secureSet } from '../services/secureStorage';
import { scanResultsData, scanSourceImage as globalSourceImage } from '../services/scanState';
import { isTestingMode } from '../services/faceCheck';

export default function SearchResults() {
    const navigate = useNavigate();
    const location = useLocation();
    // Retrieve data from state or global variables
    const { results: apiResults = scanResultsData, sourceImage = globalSourceImage, query: textQuery, searchType } = location.state || {};

    const [displayResults, setDisplayResults] = useState(apiResults || []);
    const [loading, setLoading] = useState(() => !!(textQuery && !apiResults));

    // Text-only search — results come from FacialScan.jsx via navigation state
    useEffect(() => {
        if (textQuery && !apiResults) {
            const timer = setTimeout(() => {
                setDisplayResults([]);
                setLoading(false);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [textQuery, apiResults]);

    // Save search to history when results are available
    useEffect(() => {
        if (displayResults && displayResults.length > 0) {
            const historyItem = {
                id: Date.now(),
                date: new Date().toISOString(),
                type: sourceImage ? 'image' : searchType,
                query: textQuery,
                thumbnail: sourceImage,
                matchCount: displayResults.filter(r => !r.isTargetedSearch).length,
                results: displayResults
            };

            // 🔒 Store in encrypted storage
            secureGet('search_history').then(storedHistory => {
                const existing = storedHistory || [];

                const isDuplicate = existing.some(item =>
                    (sourceImage && item.thumbnail === sourceImage) ||
                    (textQuery && item.query === textQuery && item.type === searchType)
                );

                if (!isDuplicate) {
                    const newHistory = [historyItem, ...existing].slice(0, 50);
                    secureSet('search_history', newHistory);
                }
            }).catch(err => console.error('Search history save failed:', err));
        }
    }, [displayResults, sourceImage, textQuery, searchType]);

    // Helper to extract domain from URL
    const getDomain = (url) => {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return 'unknown site';
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-800 dark:text-slate-100 antialiased min-h-screen pb-24 max-w-md mx-auto relative shadow-2xl border-x border-gray-200 dark:border-white/5">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-primary/10 px-4 py-3 flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-primary/10 text-slate-600 dark:text-slate-300 transition-colors">
                    <span className="material-icons">arrow_back</span>
                </button>
                <h1 className="text-sm font-semibold uppercase tracking-wider text-primary/80">Search Results</h1>
                <button className="p-2 -mr-2 rounded-full hover:bg-primary/10 text-slate-600 dark:text-slate-300 transition-colors">
                    <span className="material-icons">share</span>
                </button>
            </header>

            <main className="container mx-auto px-4 pt-6 space-y-6">
                {/* Header Section (Image vs Text) */}
                {sourceImage ? (
                    <section className="flex flex-col items-center text-center">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary to-purple-500 shadow-lg shadow-primary/20">
                                <img alt="Source" className="w-full h-full rounded-full object-cover border-4 border-background-light dark:border-background-dark" src={sourceImage} />
                            </div>
                        </div>
                        <div className="mt-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Target Profile</h2>
                            {(() => {
                                const faceHits = displayResults.filter(r => r.isRisk && !r.isTargetedSearch).length;
                                const directHits = displayResults.filter(r => !r.isTargetedSearch && ['Face Match', 'Identity Match', 'Direct Match', 'Image Source', 'Partial Match', 'Visual Match'].includes(r.group)).length;
                                const total = faceHits + directHits;
                                const platforms = displayResults.filter(r => r.isTargetedSearch).length;
                                if (total > 0) {
                                    return <p className="text-sm text-red-500 font-semibold">{total} match{total !== 1 ? 'es' : ''} found</p>;
                                } else if (platforms > 0) {
                                    return <p className="text-sm text-slate-500 dark:text-slate-400">0 direct matches · {platforms} platforms to check</p>;
                                }
                                return <p className="text-sm text-slate-500 dark:text-slate-400">No matches found</p>;
                            })()}
                        </div>
                    </section>
                ) : (
                    <section className="bg-primary/5 rounded-xl p-6 text-center border border-primary/10">
                        <span className="material-icons text-4xl text-primary mb-2">
                            {searchType === 'phone' ? 'phone_iphone' : searchType === 'handle' ? 'alternate_email' : 'badge'}
                        </span>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            "{textQuery || 'Unspecified'}"
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">
                            Running {searchType} search...
                        </p>
                    </section>
                )}

                {loading ? (
                    <div className="py-10 flex flex-col items-center justify-center space-y-4">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-gray-500 animate-pulse">Scanning regulated databases...</p>
                    </div>
                ) : (
                    <>
                        {(!displayResults || displayResults.length === 0) ? (
                            <div className="text-center py-10">
                                <p className="text-slate-500">No matches found.</p>
                                {!isTestingMode() && textQuery && (
                                    <p className="text-xs text-orange-500 mt-2">Note: Text search requires backend support in Production Mode.</p>
                                )}
                                <button onClick={() => navigate('/')} className="mt-4 text-primary hover:underline">Start New Search</button>
                            </div>
                        ) : (
                            <>
                                {/* Risk Level Widget */}
                                <section className="bg-white dark:bg-primary/5 border border-primary/10 rounded-xl p-5 shadow-sm">
                                    <div className="flex justify-between items-end mb-2">
                                        <h3 className="font-semibold text-slate-700 dark:text-slate-200">Analysis</h3>
                                        <span className="text-xs font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">COMPLETED</span>
                                    </div>
                                    {(() => {
                                        const faceHits = displayResults.filter(r => r.isRisk && !r.isTargetedSearch).length;
                                        const directHits = displayResults.filter(r => !r.isTargetedSearch && ['Face Match', 'Identity Match', 'Direct Match', 'Image Source', 'Partial Match', 'Visual Match'].includes(r.group)).length;
                                        const total = faceHits + directHits;
                                        const platforms = displayResults.filter(r => r.isTargetedSearch).length;
                                        if (total > 0) {
                                            return <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">Found <strong className="text-red-500">{total} direct match{total !== 1 ? 'es' : ''}</strong> across the internet{platforms > 0 ? ` + ${platforms} platforms to check manually` : ''}.</p>;
                                        }
                                        return <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">No direct matches found online.{platforms > 0 ? <> Check <strong>{platforms} adult platforms</strong> manually below.</> : ''}</p>;
                                    })()}
                                </section>

                                {/* Manual Reverse Search — shown when no automatic matches found */}
                                {sourceImage && (() => {
                                    const faceHits = displayResults.filter(r => r.isRisk && !r.isTargetedSearch).length;
                                    const directHits = displayResults.filter(r => !r.isTargetedSearch && ['Face Match', 'Identity Match', 'Direct Match', 'Image Source', 'Partial Match', 'Visual Match'].includes(r.group)).length;
                                    if (faceHits + directHits > 0) return null;
                                    const savePhoto = () => {
                                        const a = document.createElement('a');
                                        a.href = sourceImage;
                                        a.download = 'redflag-scan.jpg';
                                        a.click();
                                    };
                                    const engines = [
                                        { name: 'Yandex', desc: 'Mejor para encontrar personas', url: 'https://yandex.com/images/', icon: '🔍', color: 'from-red-500 to-red-600' },
                                        { name: 'TinEye', desc: 'Búsqueda de imagen exacta', url: 'https://tineye.com/', icon: '👁️', color: 'from-teal-500 to-teal-600' },
                                        { name: 'Google Imágenes', desc: 'Subir foto manualmente', url: 'https://images.google.com/', icon: '🌐', color: 'from-blue-500 to-blue-600' },
                                        { name: 'Bing Visual', desc: 'Buscar visualmente', url: 'https://www.bing.com/visualsearch', icon: '🔷', color: 'from-sky-500 to-sky-600' },
                                        { name: 'FaceCheck.id', desc: 'Búsqueda facial directa', url: 'https://facecheck.id/', icon: '🧬', color: 'from-purple-500 to-purple-600' },
                                        { name: 'PimEyes', desc: 'Reconocimiento facial web', url: 'https://pimeyes.com/', icon: '👤', color: 'from-orange-500 to-orange-600' },
                                    ];
                                    return (
                                        <section className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                                <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 text-sm">
                                                    <span className="material-icons text-sm text-slate-500">image_search</span>
                                                    Búsqueda Manual por Imagen
                                                </h3>
                                                <button
                                                    onClick={savePhoto}
                                                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg px-3 py-1.5 transition-colors"
                                                >
                                                    <span className="material-icons text-xs">download</span>
                                                    Guardar foto
                                                </button>
                                            </div>
                                            <div className="p-3">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                                    No se encontraron coincidencias automáticas. Guarda la foto y súbela manualmente a estos motores de búsqueda:
                                                </p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {engines.map((eng, i) => (
                                                        <a key={i} href={eng.url} target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary/40 hover:bg-primary/5 transition-all group">
                                                            <span className="text-lg flex-shrink-0">{eng.icon}</span>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-primary truncate">{eng.name}</p>
                                                                <p className="text-[9px] text-slate-400 truncate">{eng.desc}</p>
                                                            </div>
                                                        </a>
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-2.5 text-center">
                                                    💡 Yandex y PimEyes son los más efectivos para encontrar personas
                                                </p>
                                            </div>
                                        </section>
                                    );
                                })()}

                                {/* Results List */}
                                {/* Detailed Search Sections */}
                                <section className="space-y-6">

                                    {/* ✅ Direct Matches — real hits from Vision API (identity, image, web pages) */}
                                    {displayResults.some(r => !r.isTargetedSearch && ['Face Match', 'Identity Match', 'Direct Match', 'Image Source', 'Partial Match', 'Visual Match'].includes(r.group)) && (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 rounded-xl overflow-hidden">
                                            <div className="bg-emerald-100/50 dark:bg-emerald-900/20 px-4 py-3 border-b border-emerald-200 dark:border-emerald-900/30 flex justify-between items-center">
                                                <h3 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                                    <span className="material-icons text-sm">travel_explore</span>
                                                    Direct Matches Found
                                                </h3>
                                                <span className="text-[10px] uppercase font-bold tracking-wide text-emerald-600/70 dark:text-emerald-400/70">
                                                    {displayResults.filter(r => !r.isTargetedSearch && ['Face Match', 'Identity Match', 'Direct Match', 'Image Source', 'Partial Match', 'Visual Match'].includes(r.group)).length} result(s)
                                                </span>
                                            </div>
                                            <div className="p-2 grid gap-2">
                                                {displayResults.filter(r => !r.isTargetedSearch && ['Face Match', 'Identity Match', 'Direct Match', 'Image Source', 'Partial Match', 'Visual Match'].includes(r.group)).map((item, i) => (
                                                    <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                                                        className="flex gap-3 p-3 bg-white dark:bg-emerald-900/5 rounded-lg border border-emerald-100 dark:border-emerald-900/20 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors group">

                                                        {/* Thumbnail: base64 (FaceCheck) > imgSrc (Vision image URL) > favicon > icon */}
                                                        <div className="w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center">
                                                            {item.base64 ? (
                                                                <img src={item.base64} alt="Face match" className="w-full h-full object-cover" crossOrigin="anonymous" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                                                            ) : item.imgSrc ? (
                                                                <img src={item.imgSrc} alt="Photo found" className="w-full h-full object-cover" crossOrigin="anonymous" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                                                            ) : item.faviconUrl ? (
                                                                <img src={item.faviconUrl} alt="Site" className="w-8 h-8 object-contain" onError={e => { e.target.style.display = 'none'; }} />
                                                            ) : (
                                                                <span className="material-icons text-xl text-emerald-500">{item.icon || 'link'}</span>
                                                            )}
                                                            {/* Hidden fallback icon shown via JS onError */}
                                                            <span className="material-icons text-xl text-emerald-500 hidden">{item.icon || 'image'}</span>
                                                        </div>

                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                                            <div>
                                                                <p className="font-semibold text-slate-800 dark:text-white text-sm group-hover:text-emerald-700 dark:group-hover:text-emerald-300 line-clamp-2 leading-tight">
                                                                    {item.group === 'Identity Match' ? item.title : (item.title !== item.url ? item.title : getDomain(item.url))}
                                                                </p>
                                                                <span className="inline-block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded">
                                                                    {item.group}
                                                                </span>
                                                            </div>
                                                            {/* URL / location where found */}
                                                            <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
                                                                <span className="material-icons text-[11px] text-slate-400 flex-shrink-0">language</span>
                                                                <p className="text-[10px] text-blue-500 dark:text-blue-400 truncate font-mono">{item.url}</p>
                                                            </div>
                                                        </div>

                                                        <span className="material-icons text-slate-300 group-hover:text-emerald-400 flex-shrink-0 self-center">open_in_new</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 🚩 Risk Analysis Section — real hits + targeted platform searches */}
                                    {displayResults.some(r => r.isRisk) && (
                                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl overflow-hidden">
                                            <div className="bg-red-100/50 dark:bg-red-900/20 px-4 py-3 border-b border-red-200 dark:border-red-900/30 flex justify-between items-center">
                                                <h3 className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                                                    <span className="material-icons text-sm">gavel</span>
                                                    Risk Analysis
                                                </h3>
                                                <span className="text-[10px] uppercase font-bold tracking-wide text-red-600/70 dark:text-red-400/70">High Priority</span>
                                            </div>

                                            {/* Real face matches from FaceCheck.id */}
                                            {displayResults.some(r => r.isRisk && !r.isTargetedSearch) && (
                                                <>
                                                    <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                                                        <p className="text-[10px] uppercase font-bold tracking-wider text-red-600/60 dark:text-red-400/60">Face Matches Found</p>
                                                        <span className="text-[10px] text-red-500 font-bold">
                                                            {displayResults.filter(r => r.isRisk && !r.isTargetedSearch).length} match(es)
                                                        </span>
                                                    </div>
                                                    <div className="px-2 pb-2 grid gap-2">
                                                        {displayResults.filter(r => r.isRisk && !r.isTargetedSearch).map((item, i) => (
                                                            <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                                                                className="flex items-center gap-3 p-3 bg-white dark:bg-red-900/5 rounded-lg border border-red-100 dark:border-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group">

                                                                {/* Face thumbnail — shows actual matched face from FaceCheck.id */}
                                                                <div className="w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800/40">
                                                                    {item.base64 ? (
                                                                        <img
                                                                            src={item.base64}
                                                                            alt="Face match"
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center">
                                                                            <span className="material-icons text-2xl text-red-400">{item.icon || 'face'}</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Info */}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-semibold text-slate-800 dark:text-white text-sm group-hover:text-red-600 dark:group-hover:text-red-300 transition-colors truncate">
                                                                        {item.title}
                                                                    </p>
                                                                    <p className="text-[10px] text-red-500 font-bold mt-0.5">{item.group}</p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <div className="flex-1 h-1.5 bg-red-100 dark:bg-red-900/40 rounded-full overflow-hidden">
                                                                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${item.score}%` }} />
                                                                        </div>
                                                                        <span className="text-[10px] text-red-600 dark:text-red-400 font-bold flex-shrink-0">{item.score}% match</span>
                                                                    </div>
                                                                </div>

                                                                <span className="material-icons text-slate-300 group-hover:text-red-400 flex-shrink-0">open_in_new</span>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </>
                                            )}

                                            {/* No real matches banner */}
                                            {!displayResults.some(r => r.isRisk && !r.isTargetedSearch) && (
                                                <div className="mx-3 my-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg flex items-start gap-3">
                                                    <span className="material-icons text-amber-500 text-base mt-0.5">info</span>
                                                    <p className="text-xs text-amber-700 dark:text-amber-300">
                                                        No direct face matches found on the internet. Use the search buttons below to manually check each adult platform.
                                                    </p>
                                                </div>
                                            )}

                                            {/* Targeted platform searches — check specific adult sites */}
                                            {displayResults.some(r => r.isTargetedSearch) && (
                                                <>
                                                    <div className="px-4 pt-2 pb-1 border-t border-red-200/50 dark:border-red-900/20">
                                                        <p className="text-[10px] uppercase font-bold tracking-wider text-red-600/60 dark:text-red-400/60">Search on Adult Platforms</p>
                                                    </div>
                                                    <div className="px-2 pb-2 grid grid-cols-2 gap-2">
                                                        {displayResults.filter(r => r.isTargetedSearch).map((item, i) => (
                                                            <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                                                                className="flex items-center gap-2 p-2.5 bg-white dark:bg-red-900/5 rounded-lg border border-red-100 dark:border-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group">
                                                                <span className="material-icons text-base text-red-400">{item.icon || 'search'}</span>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate group-hover:text-red-600 dark:group-hover:text-red-300">
                                                                        {item.title.replace('Search on ', '')}
                                                                    </p>
                                                                    <p className="text-[9px] text-slate-400 truncate">{item.group}</p>
                                                                </div>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* 🕵️ Deep Search & Social Section */}
                                    {displayResults.some(r => ['Deep Search', 'Social Media', 'Professional'].includes(r.group)) && (
                                        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-xl overflow-hidden">
                                            <div className="bg-blue-100/50 dark:bg-blue-900/20 px-4 py-3 border-b border-blue-200 dark:border-blue-900/30">
                                                <h3 className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                                                    <span className="material-icons text-sm">travel_explore</span>
                                                    Deep Background Check
                                                </h3>
                                            </div>
                                            <div className="p-2 grid gap-2">
                                                {displayResults.filter(r => ['Deep Search', 'Social Media', 'Professional'].includes(r.group)).map((item, i) => (
                                                    <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center justify-between p-3 bg-white dark:bg-blue-900/5 rounded-lg border border-blue-100 dark:border-blue-900/20 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 dark:text-blue-400">
                                                                <span className="material-icons text-lg">{item.icon || 'public'}</span>
                                                            </div>
                                                            <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">{item.title}</span>
                                                        </div>
                                                        <span className="material-icons text-slate-300 group-hover:text-blue-400 -mr-1">open_in_new</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 🌐 Standard Web Matches */}
                                    {(() => {
                                        const DIRECT_GROUPS = ['Face Match', 'Identity Match', 'Direct Match', 'Image Source', 'Partial Match', 'Visual Match'];
                                        const footprintItems = displayResults.filter(r => !r.isRisk && !r.isTargetedSearch && !['Deep Search', 'Social Media', 'Professional'].includes(r.group) && !DIRECT_GROUPS.includes(r.group));
                                        if (footprintItems.length === 0) return null;
                                        return (
                                            <div>
                                                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-1">
                                                    Digital Footprint ({footprintItems.length})
                                                </h3>
                                                <div className="space-y-3">
                                                    {footprintItems.map((item, index) => (
                                                        <div key={index} className="bg-white dark:bg-white/5 border border-primary/10 rounded-xl overflow-hidden hover:border-primary/30 transition-all">
                                                            <div className="p-4 flex gap-4">
                                                                <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg flex-shrink-0 relative overflow-hidden flex items-center justify-center">
                                                                    {item.base64 ? (
                                                                        <img className="w-full h-full object-cover" alt="Match" src={item.base64} />
                                                                    ) : (
                                                                        <span className="material-icons text-2xl text-slate-400">public</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                                    <h4 className="font-medium text-slate-800 dark:text-white truncate text-sm mb-1">{item.title || getDomain(item.url)}</h4>
                                                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate block">
                                                                        {item.url}
                                                                    </a>
                                                                    <div className="flex items-center gap-2 mt-2">
                                                                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">
                                                                            {item.group || 'General'}
                                                                        </span>
                                                                        <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                                                                            {item.score}% Match
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </section>
                            </>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
