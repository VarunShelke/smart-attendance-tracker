import React, {useCallback, useEffect, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {fetchAuthSession} from 'aws-amplify/auth';
import {useAuth} from '../hooks/useAuth';
import FaceRegistration from '../components/camera/FaceRegistration';
import Alert from '../components/ui/Alert';

/**
 * Session validation state for the face registration flow
 *
 * Note: Users arrive here after email verification, which automatically
 * authenticates them. We only need to validate their session, not sign them in.
 */
const SessionState = {
    IDLE: 'IDLE',
    VALIDATING: 'VALIDATING',
    VALID: 'VALID',
    INVALID: 'INVALID',
    COMPLETING: 'COMPLETING',
} as const;

type SessionState = typeof SessionState[keyof typeof SessionState];

interface LocationState {
    email?: string;
}

const FaceRegistrationPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {refreshUser} = useAuth();

    // Extract navigation state with type safety
    const {email} = (location.state as LocationState) || {};

    // Session validation state management
    const [sessionState, setSessionState] = useState<SessionState>(SessionState.IDLE);
    const [sessionError, setSessionError] = useState<string | null>(null);

    /**
     * Validates that the user has a valid authenticated session with available tokens
     *
     * Users arrive here after email verification, which automatically authenticates them.
     * We validate their session to ensure they have valid tokens for API calls.
     */
    const validateAndRefreshSession = useCallback(async (): Promise<void> => {
        try {
            setSessionState(SessionState.VALIDATING);
            setSessionError(null);

            // Fetch the current session
            const session = await fetchAuthSession();

            // Validate that tokens are present
            const hasValidTokens = !!(session.tokens?.idToken && session.tokens?.accessToken);

            if (!hasValidTokens) {
                throw new Error('Session tokens not available');
            }

            // Refresh user context to get latest user data
            await refreshUser();

            setSessionState(SessionState.VALID);
        } catch (error: unknown) {
            console.error('Session validation failed:', error);

            const err = error as { name?: string; message?: string };
            const errorMessage = err.message || 'Session validation failed';

            setSessionError(errorMessage);
            setSessionState(SessionState.INVALID);

            // Redirect to login after brief delay
            setTimeout(() => {
                navigate('/login', {
                    replace: true,
                    state: {
                        message: 'Your session has expired. Please sign in again to register your face.',
                    },
                });
            }, 2000);
        }
    }, [refreshUser, navigate]);

    /**
     * Handles successful face registration
     * Refreshes user data and navigates to dashboard
     */
    const handleFaceRegistrationSuccess = useCallback(async () => {
        try {
            setSessionState(SessionState.COMPLETING);

            // Refresh user data to reflect the updated face registration status
            await refreshUser();

            // Navigate to dashboard
            navigate('/dashboard', {replace: true});
        } catch (error) {
            console.error('Error completing registration:', error);

            // Even if refresh fails, still redirect to login with success message
            navigate('/login', {
                replace: true,
                state: {message: 'Face registered successfully! Please log in.'},
            });
        }
    }, [refreshUser, navigate]);

    /**
     * Validate required data and session on mount
     */
    useEffect(() => {
        // Redirect if email is missing
        if (!email) {
            console.error('Missing required email parameter');
            navigate('/signup', {replace: true});
            return;
        }

        // Validate and refresh the session
        validateAndRefreshSession();
    }, [email, navigate, validateAndRefreshSession]);

    // Early return: Missing required data
    if (!email) {
        return null; // Will redirect via useEffect
    }

    // Loading state: Validating session
    if (sessionState === SessionState.VALIDATING) {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center px-4">
                <div className="text-center">
                    <div
                        className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"
                        aria-label="Loading"
                    />
                    <p className="text-gray-600 font-medium">Validating session...</p>
                    <p className="text-gray-500 text-sm mt-2">Please wait</p>
                </div>
            </div>
        );
    }

    // Error state: Session validation failed
    if (sessionState === SessionState.INVALID && sessionError) {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center px-4">
                <div className="max-w-md w-full">
                    <Alert
                        type="error"
                        message={sessionError}
                        onClose={() => setSessionError(null)}
                    />
                    <p className="text-center text-gray-600 text-sm mt-4">
                        Redirecting to login...
                    </p>
                </div>
            </div>
        );
    }

    // Loading state: Completing registration
    if (sessionState === SessionState.COMPLETING) {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center px-4">
                <div className="text-center">
                    <div
                        className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"
                        aria-label="Loading"
                    />
                    <p className="text-gray-600 font-medium">Completing registration...</p>
                    <p className="text-gray-500 text-sm mt-2">Redirecting to dashboard</p>
                </div>
            </div>
        );
    }

    // Main content: Show face registration UI only when session is valid
    return (
        <div
            className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center px-4 py-12">
            <div className="absolute inset-0 bg-grid-pattern opacity-5"/>
            <div className="relative z-10 w-full max-w-2xl">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div
                            className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                            <svg
                                className="w-8 h-8 text-primary-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Register Your Face
                        </h1>
                        <p className="text-gray-600">
                            Complete your profile by registering your face for attendance tracking
                        </p>
                    </div>

                    {/* Face Registration Component */}
                    <FaceRegistration
                        onSuccess={handleFaceRegistrationSuccess}
                    />

                    {/* Privacy Information */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <div className="flex items-start space-x-3 text-sm text-gray-600">
                            <svg
                                className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                            <div>
                                <p className="font-medium text-gray-900 mb-1">Your Privacy Matters</p>
                                <p>
                                    Your face photo is securely stored and used only for attendance verification.
                                    You can update or remove it anytime from your profile settings.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FaceRegistrationPage;