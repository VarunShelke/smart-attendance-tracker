/**
 * Camera Utilities
 *
 * Shared utilities for camera access and photo capture functionality.
 * Used by both face registration and attendance capture features.
 *
 * @module utils/cameraUtils
 */

/**
 * Standard camera constraints for high-quality face capture
 * Optimized for Amazon Rekognition face detection
 */
export const getCameraConstraints = (): MediaStreamConstraints => ({
    video: {
        width: {ideal: 1280},
        height: {ideal: 720},
        facingMode: 'user', // Front camera (selfie mode)
    },
    audio: false,
});

/**
 * Start camera and return media stream
 *
 * @returns Promise resolving to MediaStream
 * @throws Error with user-friendly message if camera access fails
 */
export async function startCamera(): Promise<MediaStream> {
    try {
        const stream = await navigator.mediaDevices.getUserMedia(getCameraConstraints());
        return stream;
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

        throw new Error(errorMessage);
    }
}

/**
 * Stop all tracks in a media stream and clean up
 *
 * @param stream - MediaStream to stop
 */
export function stopCamera(stream: MediaStream | null): void {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}

/**
 * Capture photo from video element and convert to base64
 *
 * @param videoElement - HTMLVideoElement to capture from
 * @param quality - JPEG quality (0-1), default 1.0 for maximum quality
 * @returns Base64-encoded image data URL
 * @throws Error if capture fails
 */
export function capturePhotoFromVideo(
    videoElement: HTMLVideoElement,
    quality: number = 1.0
): string {
    try {
        // Create a canvas to capture the current video frame
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get canvas context');
        }

        // Draw the current video frame to canvas
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        // Convert to high-quality JPEG (1.0 = maximum quality for Rekognition)
        const imageDataUrl = canvas.toDataURL('image/jpeg', quality);

        return imageDataUrl;
    } catch (error) {
        console.error('Error capturing photo:', error);
        throw new Error('Failed to capture photo. Please try again.');
    }
}

/**
 * Strip data URL prefix from base64 image string
 * Backend expects pure base64-encoded data without the data URL prefix
 *
 * @param dataUrl - Base64 data URL string (e.g., "data:image/jpeg;base64,...")
 * @returns Pure base64 string without prefix
 */
export function stripDataUrlPrefix(dataUrl: string): string {
    return dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
}

/**
 * Attach media stream to video element
 *
 * @param videoElement - HTMLVideoElement to attach stream to
 * @param stream - MediaStream from camera
 */
export function attachStreamToVideo(
    videoElement: HTMLVideoElement,
    stream: MediaStream
): void {
    videoElement.srcObject = stream;
}

/**
 * Detach media stream from video element
 *
 * @param videoElement - HTMLVideoElement to detach stream from
 */
export function detachStreamFromVideo(videoElement: HTMLVideoElement): void {
    videoElement.srcObject = null;
}
