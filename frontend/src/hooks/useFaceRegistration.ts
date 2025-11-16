import React, {useCallback, useRef, useState} from 'react';
import type {FaceRegistrationState} from '../types/auth';
import {registerFace, ApiError} from '../services/api';

interface UseFaceRegistrationReturn {
    state: FaceRegistrationState;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    startCamera: () => Promise<void>;
    stopCamera: () => void;
    capturePhoto: () => void;
    retakePhoto: () => void;
    registerFace: () => Promise<void>;
}

export const useFaceRegistration = (): UseFaceRegistrationReturn => {
    const [state, setState] = useState<FaceRegistrationState>({
        isCapturing: false,
        isUploading: false,
        capturedImage: null,
        error: null,
        success: false,
    });

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startCamera = useCallback(async () => {
        try {
            setState(prev => ({...prev, error: null, isCapturing: true}));

            // Request camera access with high quality for Amazon Rekognition
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: {ideal: 1280},
                    height: {ideal: 720},
                    facingMode: 'user', // Front camera (selfie mode)
                },
                audio: false,
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            setState(prev => ({...prev, isCapturing: false}));
        } catch (error) {
            console.error('Error accessing camera:', error);
            let errorMessage = 'Failed to access camera. Please ensure camera permissions are granted.';

            if (error instanceof Error) {
                if (error.name === 'NotAllowedError') {
                    errorMessage = 'Camera access denied. Please grant camera permissions in your browser settings.';
                } else if (error.name === 'NotFoundError') {
                    errorMessage = 'No camera found on your device.';
                } else if (error.name === 'NotReadableError') {
                    errorMessage = 'Camera is already in use by another application.';
                }
            }

            setState(prev => ({
                ...prev,
                error: errorMessage,
                isCapturing: false,
            }));
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const capturePhoto = useCallback(() => {
        if (!videoRef.current) {
            setState(prev => ({...prev, error: 'Video element not ready'}));
            return;
        }

        try {
            // Create canvas to capture the current video frame
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;

            const context = canvas.getContext('2d');
            if (!context) {
                throw new Error('Failed to get canvas context');
            }

            // Draw current video frame to canvas
            context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

            // Convert to high-quality JPEG (1.0 = maximum quality for Rekognition)
            const imageDataUrl = canvas.toDataURL('image/jpeg', 1.0);

            setState(prev => ({
                ...prev,
                capturedImage: imageDataUrl,
                error: null,
            }));

            // Stop camera after capture
            stopCamera();
        } catch (error) {
            console.error('Error capturing photo:', error);
            setState(prev => ({
                ...prev,
                error: 'Failed to capture photo. Please try again.',
            }));
        }
    }, [stopCamera]);

    const retakePhoto = useCallback(() => {
        setState(prev => ({
            ...prev,
            capturedImage: null,
            error: null,
        }));
        startCamera();
    }, [startCamera]);

    const handleRegisterFace = useCallback(async () => {
        if (!state.capturedImage) {
            setState(prev => ({...prev, error: 'No photo captured'}));
            return;
        }

        setState(prev => ({...prev, isUploading: true, error: null}));

        try {
            // Send base64 image to API Gateway
            await registerFace(state.capturedImage);

            console.log('Face registered successfully');

            setState(prev => ({
                ...prev,
                isUploading: false,
                success: true,
                error: null,
            }));
        } catch (error) {
            console.error('Error registering face:', error);
            let errorMessage = 'Failed to register face. Please try again.';

            if (error instanceof ApiError) {
                errorMessage = error.message;
            } else if (error instanceof Error) {
                errorMessage = error.message || errorMessage;
            }

            setState(prev => ({
                ...prev,
                isUploading: false,
                error: errorMessage,
            }));
        }
    }, [state.capturedImage]);

    return {
        state,
        videoRef,
        startCamera,
        stopCamera,
        capturePhoto,
        retakePhoto,
        registerFace: handleRegisterFace,
    };
};