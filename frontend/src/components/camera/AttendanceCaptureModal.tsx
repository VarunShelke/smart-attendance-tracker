import React, {useEffect} from 'react';
import {useAttendanceCapture} from '../../hooks/useAttendanceCapture';
import type {Course} from '../../types/course';
import Button from '../ui/Button';

interface AttendanceCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (trackingId: string) => void;
    course?: Course;
}

const AttendanceCaptureModal: React.FC<AttendanceCaptureModalProps> = ({
                                                                             isOpen,
                                                                             onClose,
                                                                             onSuccess,
                                                                             course,
                                                                         }) => {
    const {
        state,
        videoRef,
        startCamera,
        stopCamera,
        capturePhoto,
        retakePhoto,
        submitAttendance,
        reset,
    } = useAttendanceCapture();

    // Start camera when modal opens
    useEffect(() => {
        if (isOpen && state.stage === 'initial') {
            startCamera();
        }
    }, [isOpen, state.stage, startCamera]);

    // Cleanup on unmount or close
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    // Handle success
    useEffect(() => {
        if (state.stage === 'success' && state.trackingId) {
            onSuccess(state.trackingId);
        }
    }, [state.stage, state.trackingId, onSuccess]);

    const handleClose = () => {
        reset();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-semibold text-gray-800">
                        {course ? `Mark Attendance - ${course.course_name}` : 'Mark Attendance'}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={state.isLoading}
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Camera or Captured Image */}
                    <div className="relative mb-6 bg-gray-900 rounded-lg overflow-hidden aspect-video">
                        {state.stage === 'camera' && !state.capturedImage && (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                        )}

                        {state.capturedImage && (
                            <img
                                src={state.capturedImage}
                                alt="Captured"
                                className="w-full h-full object-cover"
                            />
                        )}

                        {state.stage === 'initial' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-white text-center">
                                    <svg
                                        className="w-16 h-16 mx-auto mb-4 opacity-50"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                    </svg>
                                    <p>Initializing camera...</p>
                                </div>
                            </div>
                        )}

                        {state.isLoading && state.stage === 'submitting' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                                <div className="text-white text-center">
                                    <svg
                                        className="animate-spin h-12 w-12 mx-auto mb-4"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    <p className="font-medium">Processing attendance...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {state.error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start">
                                <svg
                                    className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <div className="flex-1">
                                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                                    <p className="text-sm text-red-700 mt-1">{state.error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Success Message */}
                    {state.stage === 'success' && state.trackingId && (
                        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-start">
                                <svg
                                    className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <div className="flex-1">
                                    <h3 className="text-sm font-medium text-green-800">
                                        Attendance Submitted Successfully!
                                    </h3>
                                    <p className="text-sm text-green-700 mt-1">
                                        Your attendance is being verified. Tracking ID: {state.trackingId}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Instructions */}
                    {state.stage === 'camera' && !state.capturedImage && (
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong>Position your face in the frame</strong> and click "Capture Photo"
                                when ready.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
                    {state.stage === 'camera' && !state.capturedImage && (
                        <>
                            <Button variant="outline" onClick={handleClose} className="flex-1">
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={capturePhoto}
                                disabled={state.isLoading}
                                className="flex-1"
                            >
                                Capture Photo
                            </Button>
                        </>
                    )}

                    {state.capturedImage && state.stage === 'captured' && (
                        <>
                            <Button variant="outline" onClick={retakePhoto} className="flex-1">
                                Retake
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => submitAttendance(course)}
                                isLoading={state.isLoading}
                                className="flex-1"
                            >
                                Submit Attendance
                            </Button>
                        </>
                    )}

                    {state.stage === 'success' && (
                        <Button variant="primary" onClick={handleClose} fullWidth>
                            Close
                        </Button>
                    )}

                    {state.stage === 'error' && (
                        <>
                            <Button variant="outline" onClick={handleClose} className="flex-1">
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={reset} className="flex-1">
                                Try Again
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttendanceCaptureModal;
