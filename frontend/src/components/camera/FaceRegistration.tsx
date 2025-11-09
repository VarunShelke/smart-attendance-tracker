import React, {useEffect} from 'react';
import {useFaceRegistration} from '../../hooks/useFaceRegistration';
import Button from '../ui/Button';
import Alert from '../ui/Alert';

interface FaceRegistrationProps {
    userId: string;
    onSuccess: () => void;
    onSkip: () => void;
}

const FaceRegistration: React.FC<FaceRegistrationProps> = ({userId, onSuccess, onSkip}) => {
    const {
        state,
        videoRef,
        startCamera,
        stopCamera,
        capturePhoto,
        retakePhoto,
        uploadPhoto,
        skipRegistration,
    } = useFaceRegistration();

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    const handleUpload = async () => {
        await uploadPhoto(userId);
        if (!state.error) {
            setTimeout(() => {
                onSuccess();
            }, 1500);
        }
    };

    const handleSkip = async () => {
        await skipRegistration();
        onSkip();
    };

    // Show a success state
    if (state.success) {
        return (
            <div className="text-center">
                <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <svg
                        className="w-10 h-10 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Face Registered Successfully!
                </h3>
                <p className="text-gray-600">
                    Redirecting to dashboard...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Error Alert */}
            {state.error && (
                <Alert
                    type="error"
                    message={state.error}
                    onClose={() => {
                    }}
                />
            )}

            {/* Camera View or Captured Photo */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                {!state.capturedImage ? (
                    // Live Camera Feed
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                        />
                        {!videoRef.current?.srcObject && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                <div className="text-center">
                                    <svg
                                        className="mx-auto w-16 h-16 text-gray-400 mb-4"
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
                                    <p className="text-gray-300 mb-4">Camera not started</p>
                                    <Button
                                        variant="primary"
                                        onClick={startCamera}
                                        isLoading={state.isCapturing}
                                    >
                                        Start Camera
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Camera Guide Overlay */}
                        {videoRef.current?.srcObject && (
                            <div className="absolute inset-0 pointer-events-none">
                                <div
                                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-white rounded-full opacity-30"></div>
                                <div
                                    className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg text-sm">
                                    Position your face in the circle
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    // Captured Photo Preview
                    <img
                        src={state.capturedImage}
                        alt="Captured face"
                        className="w-full h-full object-cover"
                    />
                )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
                {!state.capturedImage ? (
                    // Capture and Skip Buttons
                    <>
                        <Button
                            variant="primary"
                            fullWidth
                            onClick={capturePhoto}
                            disabled={!videoRef.current?.srcObject || state.isCapturing}
                        >
                            Capture Photo
                        </Button>
                        <Button
                            variant="outline"
                            fullWidth
                            onClick={handleSkip}
                        >
                            Skip for Now
                        </Button>
                    </>
                ) : (
                    // Upload and Retake Buttons
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="secondary"
                            onClick={retakePhoto}
                            disabled={state.isUploading}
                        >
                            Retake
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleUpload}
                            isLoading={state.isUploading}
                        >
                            {state.isUploading ? 'Uploading...' : 'Upload & Continue'}
                        </Button>
                    </div>
                )}
            </div>

            {/* Helper Text */}
            <div className="text-center text-sm text-gray-500">
                <p className="mb-1">
                    Your photo will be used for attendance tracking
                </p>
                <p>
                    Make sure your face is clearly visible and well-lit
                </p>
            </div>
        </div>
    );
};

export default FaceRegistration;