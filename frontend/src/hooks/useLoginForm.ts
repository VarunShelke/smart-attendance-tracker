import type {FormEvent} from 'react';
import {useState} from 'react';
import {getCurrentUser, signIn} from 'aws-amplify/auth';
import {useNavigate} from 'react-router-dom';
import type {CognitoError, LoginFormData, LoginFormErrors} from '../types/auth';
import {validateEmail} from '../utils/validation';
import {useAuth} from './useAuth';

interface UseLoginFormReturn {
    formData: LoginFormData;
    errors: LoginFormErrors;
    isLoading: boolean;
    handleChange: (field: keyof LoginFormData, value: string | boolean) => void;
    handleSubmit: (e: FormEvent) => Promise<void>;
    clearError: (field: keyof LoginFormErrors) => void;
}

export const useLoginForm = (): UseLoginFormReturn => {
    const navigate = useNavigate();
    const {refreshUser} = useAuth();

    const [formData, setFormData] = useState<LoginFormData>({
        email: '',
        password: '',
        rememberMe: false,
    });

    const [errors, setErrors] = useState<LoginFormErrors>({});
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (field: keyof LoginFormData, value: string | boolean) => {
        setFormData((prev) => ({...prev, [field]: value}));
        // Clear error for this field when user starts typing
        if (errors[field as keyof LoginFormErrors]) {
            setErrors((prev) => ({...prev, [field]: undefined}));
        }
    };

    const clearError = (field: keyof LoginFormErrors) => {
        setErrors((prev) => ({...prev, [field]: undefined}));
    };

    const validateForm = (): boolean => {
        const newErrors: LoginFormErrors = {};

        const emailError = validateEmail(formData.email);
        if (emailError) newErrors.email = emailError;

        if (!formData.password) {
            newErrors.password = 'Password is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            // Check if user is already authenticated
            try {
                const currentUser = await getCurrentUser();
                if (currentUser) {
                    console.log('User already authenticated, redirecting to dashboard');
                    await refreshUser();
                    navigate('/dashboard');
                    return;
                }
            } catch {
                // No current user, proceed with login
            }

            const {isSignedIn, nextStep} = await signIn({
                username: formData.email,
                password: formData.password,
                options: {
                    authFlowType: formData.rememberMe ? 'USER_SRP_AUTH' : 'USER_SRP_AUTH',
                },
            });

            console.log('Sign in successful:', {isSignedIn, nextStep});

            // Handle different next steps
            if (nextStep.signInStep === 'CONFIRM_SIGN_UP') {
                // User needs to verify email
                navigate('/verify-email', {
                    state: {
                        email: formData.email,
                        message: 'Please verify your email before signing in.'
                    },
                });
                return;
            }

            if (nextStep.signInStep === 'DONE' && isSignedIn) {
                // Refresh user data in context
                await refreshUser();

                // Redirect to dashboard
                navigate('/dashboard');
            }
        } catch (error) {
            const cognitoError = error as CognitoError;
            console.error('Sign in error:', cognitoError);

            let errorMessage = 'An error occurred during sign in. Please try again.';

            if (cognitoError.name === 'UserNotFoundException') {
                errorMessage = 'No account found with this email address.';
                setErrors({email: errorMessage});
            } else if (cognitoError.name === 'NotAuthorizedException') {
                errorMessage = 'Incorrect email or password.';
                setErrors({general: errorMessage});
                // Clear password field
                setFormData((prev) => ({...prev, password: ''}));
            } else if (cognitoError.name === 'UserNotConfirmedException') {
                // User exists but email not verified - redirect to verification
                navigate('/verify-email', {
                    state: {
                        email: formData.email,
                        message: 'Please verify your email before signing in.'
                    },
                });
                return;
            } else if (cognitoError.name === 'PasswordResetRequiredException') {
                errorMessage = 'Password reset is required. Please reset your password.';
                setErrors({general: errorMessage});
            } else if (cognitoError.name === 'TooManyRequestsException' || cognitoError.name === 'LimitExceededException') {
                errorMessage = 'Too many login attempts. Please try again later.';
                setErrors({general: errorMessage});
            } else if (cognitoError.name === 'InvalidParameterException') {
                errorMessage = 'Invalid email or password format.';
                setErrors({general: errorMessage});
            } else if (cognitoError.name === 'UserAlreadyAuthenticatedException') {
                // User already has an active session, just refresh and redirect
                console.log('User already authenticated, redirecting...');
                await refreshUser();
                navigate('/dashboard');
                return;
            } else {
                setErrors({general: cognitoError.message || errorMessage});
            }
        } finally {
            setIsLoading(false);
        }
    };

    return {
        formData,
        errors,
        isLoading,
        handleChange,
        handleSubmit,
        clearError,
    };
};
