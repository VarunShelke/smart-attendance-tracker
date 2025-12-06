import {useState, useCallback} from 'react';
import {confirmSignIn} from 'aws-amplify/auth';
import {useNavigate} from 'react-router-dom';
import type {NewPasswordFormData, CognitoError} from '../types/auth';
import {useAuth} from './useAuth';

interface UseCompleteSignInReturn {
    isLoading: boolean;
    error: string | undefined;
    handleNewPasswordRequired: (data: NewPasswordFormData) => Promise<void>;
}

export const useCompleteSignIn = (): UseCompleteSignInReturn => {
    const navigate = useNavigate();
    const {refreshUser} = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const handleNewPasswordRequired = useCallback(async (data: NewPasswordFormData) => {
        setIsLoading(true);
        setError(undefined);

        try {
            // Build user attributes object for missing attributes
            const userAttributes: Record<string, string> = {};

            if (data.givenName) {
                userAttributes['given_name'] = data.givenName.trim();
            }

            if (data.familyName) {
                userAttributes['family_name'] = data.familyName.trim();
            }

            // Complete the sign-in challenge with new password and attributes
            const {isSignedIn, nextStep} = await confirmSignIn({
                challengeResponse: data.newPassword,
                options: {
                    userAttributes: Object.keys(userAttributes).length > 0 ? userAttributes : undefined,
                },
            });

            console.log('Password change successful:', {isSignedIn, nextStep});

            // Check if sign-in is complete
            if (nextStep.signInStep === 'DONE' && isSignedIn) {
                // Refresh user data to get updated profile and groups
                await refreshUser();

                // Redirect to landing page for role-based redirect
                navigate('/', {replace: true});
            } else {
                // Handle any additional steps (shouldn't happen in normal flow)
                console.warn('Unexpected sign-in step after password change:', nextStep);
                setError('Sign-in requires additional steps. Please contact support.');
            }
        } catch (err) {
            const cognitoError = err as CognitoError;
            console.error('Error completing sign-in challenge:', cognitoError);

            let errorMessage = 'An error occurred while setting your password. Please try again.';

            if (cognitoError.name === 'InvalidPasswordException') {
                errorMessage = 'Password does not meet requirements. Please check the password policy.';
            } else if (cognitoError.name === 'InvalidParameterException') {
                errorMessage = 'Invalid input. Please check all fields and try again.';
            } else if (cognitoError.name === 'NotAuthorizedException') {
                errorMessage = 'Session expired. Please log in again.';
                // Redirect back to login after a short delay
                setTimeout(() => {
                    navigate('/login', {replace: true});
                }, 2000);
            } else if (cognitoError.name === 'TooManyRequestsException' || cognitoError.name === 'LimitExceededException') {
                errorMessage = 'Too many attempts. Please try again later.';
            } else if (cognitoError.message) {
                errorMessage = cognitoError.message;
            }

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [navigate, refreshUser]);

    return {
        isLoading,
        error,
        handleNewPasswordRequired,
    };
};
