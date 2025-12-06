import React, {useEffect} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {NewPasswordRequiredForm} from '../components/auth/NewPasswordRequiredForm';
import {useCompleteSignIn} from '../hooks/useCompleteSignIn';
import type {CompleteSignInState} from '../types/auth';

const CompleteSignInPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const {isLoading, error, handleNewPasswordRequired} = useCompleteSignIn();

    // Get state from navigation
    const state = location.state as CompleteSignInState | undefined;

    useEffect(() => {
        // If no state is provided, redirect to login
        if (!state || !state.email || !state.challengeType) {
            console.warn('No sign-in challenge state found, redirecting to login');
            navigate('/login', {replace: true});
        }
    }, [state, navigate]);

    if (!state) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
            {/* Render appropriate form based on challenge type */}
            {state.challengeType === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' && (
                <NewPasswordRequiredForm
                    email={state.email}
                    missingAttributes={state.missingAttributes}
                    onSubmit={handleNewPasswordRequired}
                    isLoading={isLoading}
                    error={error}
                />
            )}

            {/* Future: Add other challenge type forms here (MFA, etc.) */}
            {state.challengeType !== 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' && (
                <div className="w-full max-w-lg">
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-gray-900 mb-4">
                                Unsupported Challenge
                            </h1>
                            <p className="text-gray-600 mb-6">
                                This sign-in challenge type is not yet supported. Please contact support.
                            </p>
                            <button
                                onClick={() => navigate('/login', {replace: true})}
                                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                            >
                                Back to Login
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompleteSignInPage;
