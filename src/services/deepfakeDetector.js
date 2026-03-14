/**
 * deepfakeDetector.js — Real-time deepfake detection for video calls
 * Uses face-api.js for face detection and analysis
 */

import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let isAnalyzing = false;
let analysisInterval = null;

const loadModels = async () => {
    if (modelsLoaded) return true;
    
    try {
        const MODEL_URL = '/models';
        
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        
        modelsLoaded = true;
        console.log('Deepfake detection models loaded');
        return true;
    } catch (err) {
        console.error('Failed to load deepfake models:', err);
        return false;
    }
};

/**
 * Analyze a video stream for potential deepfakes
 * @param {MediaStream} stream - Video stream to analyze
 * @param {Function} onResult - Callback with analysis result
 * @param {Function} onError - Error callback
 * @returns {Function} Cleanup function
 */
export const startDeepfakeAnalysis = async (stream, onResult, onError) => {
    const loaded = await loadModels();
    if (!loaded) {
        onError?.('Failed to load detection models');
        return () => {};
    }

    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.muted = true;
    
    await new Promise(resolve => {
        video.onloadedmetadata = resolve;
    });

    isAnalyzing = true;
    
    const analyzeFrame = async () => {
        if (!isAnalyzing) return;
        
        try {
            const detections = await faceapi
                .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceExpressions();
            
            if (detections.length === 0) {
                onResult?.({
                    isReal: false,
                    confidence: 0,
                    reason: 'No face detected',
                    risk: 'unknown'
                });
                return;
            }

            // Analyze the first (main) face
            const face = detections[0];
            const expressions = face.expressions;
            
            // Check for suspicious patterns
            let riskScore = 0;
            const reasons = [];
            
            // Low confidence detection indicates potential manipulation
            if (face.detection.score < 0.7) {
                riskScore += 0.3;
                reasons.push('Low detection confidence');
            }
            
            // Check for unusual expression combinations
            const happyScore = expressions.happy || 0;
            const surpriseScore = expressions.surprised || 0;
            
            if (happyScore > 0.9 && surpriseScore < 0.1) {
                riskScore += 0.2;
                reasons.push('Unnatural happiness expression');
            }
            
            // Check facial landmarks symmetry
            const landmarks = face.landmarks;
            if (landmarks) {
                const leftEye = landmarks.getLeftEye();
                const rightEye = landmarks.getRightEye();
                
                // Simple asymmetry check
                const leftAvgY = leftEye.reduce((a, b) => a + b.y, 0) / leftEye.length;
                const rightAvgY = rightEye.reduce((a, b) => a + b.y, 0) / rightEye.length;
                const asymmetry = Math.abs(leftAvgY - rightAvgY);
                
                if (asymmetry > 5) {
                    riskScore += 0.2;
                    reasons.push('Facial asymmetry detected');
                }
            }

            // Calculate final risk
            const isReal = riskScore < 0.5;
            const confidence = Math.max(0, 1 - riskScore);
            
            let risk = 'low';
            if (riskScore > 0.6) risk = 'high';
            else if (riskScore > 0.3) risk = 'medium';

            onResult?.({
                isReal,
                confidence,
                risk,
                reasons: reasons.length > 0 ? reasons : ['Face appears natural'],
                faceDetected: true,
            });
            
        } catch (err) {
            console.warn('Deepfake analysis error:', err);
        }
    };

    // Analyze every 2 seconds
    analysisInterval = setInterval(analyzeFrame, 2000);
    analyzeFrame(); // Initial analysis

    return () => {
        isAnalyzing = false;
        if (analysisInterval) {
            clearInterval(analysisInterval);
            analysisInterval = null;
        }
        video.srcObject = null;
    };
};

/**
 * Stop deepfake analysis
 */
export const stopDeepfakeAnalysis = () => {
    isAnalyzing = false;
    if (analysisInterval) {
        clearInterval(analysisInterval);
        analysisInterval = null;
    }
};

/**
 * Check if models are loaded
 */
export const isDeepfakeDetectionReady = () => modelsLoaded;
