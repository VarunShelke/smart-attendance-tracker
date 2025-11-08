import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signIn } from 'aws-amplify/auth';
import { useAuth } from '../contexts/AuthContext';
import FaceRegistration from '../components/camera/FaceRegistration';

const FaceRegistrationPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { refreshUser } = useAuth();
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    // Get email and password from navigation state (passed from verification page)
    const { email, password, userId } = location.state || {};

    useEffect(() => {
        // Redirect if required data is missing (email and userId are required, password is optional)
        if (!email || !userId) {
            console.error('Missing required authentication data');
            navigate('/dashboard', { replace: true });
        }
    }, [email, userId, navigate]);

    const handleSuccess = async () => {
        try {
            setIsAuthenticating(true);

            // If password is available (coming from signup flow), auto-login
            if (password) {
                try {
                    await signIn({
                        username: email,
                        password: password,
                    });
                } catch (signInError: any) {
                    // If already signed in, just continue (this can happen if user has an active session)
                    if (signInError.name === 'UserAlreadyAuthenticatedException' ||
                        signInError.name === 'NotAuthorizedException' && signInError.message?.includes('already')) {
                        console.log('User already authenticated, continuing...');
                    } else {
                        // For other errors, rethrow
                        throw signInError;
                    }
                }
            }

            // Refresh user data to get updated faceRegistered attribute
            await refreshUser();

            // Navigate to dashboard
            navigate('/dashboard', { replace: true });
        } catch (error) {
            console.error('Error during auto-login:', error);
            // If auto-login fails, redirect to login page with success message
            navigate('/login', {
                replace: true,
                state: { message: 'Face registered successfully! Please log in.' },
            });
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleSkip = async () => {
        try {
            setIsAuthenticating(true);

            // If password is available (coming from signup flow), auto-login
            if (password) {
                try {
                    await signIn({
                        username: email,
                        password: password,
                    });
                } catch (signInError: any) {
                    // If already signed in, just continue (this can happen if user has an active session)
                    if (signInError.name === 'UserAlreadyAuthenticatedException' ||
                        signInError.name === 'NotAuthorizedException' && signInError.message?.includes('already')) {
                        console.log('User already authenticated, continuing...');
                    } else {
                        // For other errors, rethrow
                        throw signInError;
                    }
                }
            }

            // Refresh user data
            await refreshUser();

            // Navigate to dashboard
            navigate('/dashboard', { replace: true });
        } catch (error) {
            console.error('Error during auto-login:', error);
            // If auto-login fails, redirect to login page
            navigate('/login', {
                replace: true,
                state: { message: 'Account created successfully! Please log in.' },
            });
        } finally {
            setIsAuthenticating(false);
        }
    };

    if (!userId) {
        return null; // Will redirect via useEffect
    }

    if (isAuthenticating) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Logging you in...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center px-4 py-12">
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
            <div className="relative z-10 w-full max-w-2xl">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
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
                        userId={userId}
                        onSuccess={handleSuccess}
                        onSkip={handleSkip}
                    />

                    {/* Info Section */}
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

                {/* Footer Note */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    You can skip this step and register your face later from your dashboard
                </p>
            </div>
        </div>
    );
};

export default FaceRegistrationPage;