import {useCallback, useRef, useState} from 'react';
import type {AttendanceCaptureState, AttendanceResponse} from '../types/attendance';
import type {Course} from '../types/course';
import {markAttendance, ApiError} from '../services/api';
import {
    startCamera as startCameraUtil,
    stopCamera as stopCameraUtil,
    capturePhotoFromVideo,
    stripDataUrlPrefix,
    attachStreamToVideo,
    detachStreamFromVideo,
} from '../utils/cameraUtils';

interface UseAttendanceCaptureReturn {
    state: AttendanceCaptureState;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    startCamera: () => Promise<void>;
    stopCamera: () => void;
    capturePhoto: () => void;
    retakePhoto: () => void;
    submitAttendance: (course?: Course) => Promise<void>;
    reset: () => void;
}

export const useAttendanceCapture = (): UseAttendanceCaptureReturn => {
    const [state, setState] = useState<AttendanceCaptureState>({
        stage: 'initial',
        capturedImage: null,
        trackingId: null,
        error: null,
        isLoading: false,
    });

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startCamera = useCallback(async () => {
        try {
            setState(prev => ({...prev, error: null, stage: 'camera', isLoading: true}));

            const stream = await startCameraUtil();
            streamRef.current = stream;

            if (videoRef.current) {
                attachStreamToVideo(videoRef.current, stream);
            }

            setState(prev => ({...prev, stage: 'camera', isLoading: false}));
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Failed to access camera. Please ensure camera permissions are granted.';

            setState(prev => ({
                ...prev,
                error: errorMessage,
                stage: 'error',
                isLoading: false,
            }));
        }
    }, []);

    const stopCamera = useCallback(() => {
        stopCameraUtil(streamRef.current);
        streamRef.current = null;

        if (videoRef.current) {
            detachStreamFromVideo(videoRef.current);
        }
    }, []);

    const capturePhoto = useCallback(() => {
        if (!videoRef.current) {
            setState(prev => ({...prev, error: 'Video element not ready', stage: 'error'}));
            return;
        }

        try {
            const imageDataUrl = capturePhotoFromVideo(videoRef.current, 1.0);

            setState(prev => ({
                ...prev,
                capturedImage: imageDataUrl,
                stage: 'captured',
                error: null,
            }));

            // Stop camera after capture
            stopCamera();
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Failed to capture photo. Please try again.';

            setState(prev => ({
                ...prev,
                error: errorMessage,
                stage: 'error',
            }));
        }
    }, [stopCamera]);

    const retakePhoto = useCallback(() => {
        setState(prev => ({
            ...prev,
            capturedImage: null,
            error: null,
            stage: 'initial',
        }));
        startCamera();
    }, [startCamera]);

    const submitAttendance = useCallback(async (course?: Course) => {
        if (!state.capturedImage) {
            setState(prev => ({...prev, error: 'No photo captured', stage: 'error'}));
            return;
        }

        setState(prev => ({...prev, stage: 'submitting', isLoading: true, error: null}));

        try {
            // Strip the data URL prefix before sending to backend
            const base64Data = stripDataUrlPrefix(state.capturedImage);
            const response: AttendanceResponse = await markAttendance(
                base64Data,
                course?.course_id,
                course?.schedule_id
            );

            console.log('Attendance marked successfully:', response);

            setState(prev => ({
                ...prev,
                stage: 'success',
                isLoading: false,
                trackingId: response.tracking_id,
                error: null,
            }));
        } catch (error) {
            console.error('Error marking attendance:', error);
            let errorMessage = 'Failed to mark attendance. Please try again.';

            if (error instanceof ApiError) {
                errorMessage = error.message;
            } else if (error instanceof Error) {
                errorMessage = error.message || errorMessage;
            }

            setState(prev => ({
                ...prev,
                stage: 'error',
                isLoading: false,
                error: errorMessage,
            }));
        }
    }, [state.capturedImage]);

    const reset = useCallback(() => {
        stopCamera();
        setState({
            stage: 'initial',
            capturedImage: null,
            trackingId: null,
            error: null,
            isLoading: false,
        });
    }, [stopCamera]);

    return {
        state,
        videoRef,
        startCamera,
        stopCamera,
        capturePhoto,
        retakePhoto,
        submitAttendance,
        reset,
    };
};
