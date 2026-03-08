// A simple in-memory store to hold the File object and tracking data
// This is used to pass data between Home -> FacialScan -> SearchResults
// without hitting React Router's history state serialization limits (DataCloneError).

export let selectedScanFile = null;
export let scanResultsData = null;
export let scanSourceImage = null;

export const setSelectedScanFile = (file) => {
    selectedScanFile = file;
};

export const setScanDetails = (results, sourceImageBase64) => {
    scanResultsData = results;
    scanSourceImage = sourceImageBase64;
};

export const clearScanDetails = () => {
    scanResultsData = null;
    scanSourceImage = null;
    selectedScanFile = null;
};
