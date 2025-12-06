import type {FormEvent} from 'react';
import {useEffect, useState} from 'react';
import {confirmSignUp, resendSignUpCode, signIn, signOut} from 'aws-amplify/auth';
import type {CognitoError, VerifyEmailFormData, VerifyEmailFormErrors} from '../types/auth';

interface UseVerifyEmailReturn {
    formData: VerifyEmailFormData;
    errors: VerifyEmailFormErrors;
    isLoading: boolean;
    isSuccess: boolean;
    isResending: boolean;
    canResend: boolean;
    resendCountdown: number;
    handleCodeChange: (code: string) => void;
    handleSubmit: (e: FormEvent) => Promise<void>;
    handleResendCode: () => Promise<void>;
    clearError: (field: keyof VerifyEmailFormErrors) => void;
}

const RESEND_COOLDOWN = 60; // 60 seconds

export const useVerifyEmail = (email: string, password?: string): UseVerifyEmailReturn => {
    const [formData, setFormData] = useState<VerifyEmailFormData>({
        email,
        code: '',
    });

    const [errors, setErrors] = useState<VerifyEmailFormErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(0);

    const canResend = resendCountdown === 0 && !isResending;

    // Countdown timer for resend button
    useEffect(() => {
        if (resendCountdown > 0) {
            const timer = setTimeout(() => {
                setResendCountdown((prev) => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCountdown]);

    const handleCodeChange = (code: string) => {
        setFormData((prev) => ({...prev, code}));
        // Clear error when user types
        if (errors.code) {
            setErrors((prev) => ({...prev, code: undefined}));
        }
    };

    const clearError = (field: keyof VerifyEmailFormErrors) => {
        setErrors((prev) => ({...prev, [field]: undefined}));
    };

    const validateForm = (): boolean => {
        const newErrors: VerifyEmailFormErrors = {};

        if (!formData.code || formData.code.length !== 6) {
            newErrors.code = 'Please enter the 6-digit verification code';
        }

        if (!/^\d{6}$/.test(formData.code)) {
            newErrors.code = 'Verification code must be 6 digits';
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
            // Confirm the email with the verification code
            await confirmSignUp({
                username: formData.email,
                confirmationCode: formData.code,
            });

            console.log('Email verification successful');

            // After confirmSignUp, Cognito may auto-authenticate the user with an incomplete session.
            // We need to sign out first, then sign in properly to establish a complete session.
            if (password) {
                try {
                    // First, sign out any auto-authenticated session to clear incomplete state
                    try {
                        await signOut();
                        console.log('Signed out auto-authenticated session');
                    } catch {
                        // If sign out fails, the user wasn't signed in - that's fine
                        console.log('No auto-authenticated session to sign out');
                    }

                    // Now sign in properly to establish a complete session with valid tokens
                    await signIn({
                        username: formData.email,
                        password: password,
                    });
                    console.log('Sign-in successful with complete session after email verification');
                } catch (signInError) {
                    console.error('Sign-in failed after email verification:', signInError);
                    throw signInError;
                }
            } else {
                console.warn('No password provided - user will need to sign in manually');
            }

            setIsSuccess(true);

            // Success handling will be done in the component (redirect to face registration)
        } catch (error) {
            const cognitoError = error as CognitoError;
            console.error('Verification error:', cognitoError);

            let errorMessage = 'An error occurred during verification. Please try again.';

            if (cognitoError.name === 'CodeMismatchException') {
                errorMessage = 'Invalid verification code. Please check and try again.';
                setErrors({code: errorMessage});
            } else if (cognitoError.name === 'ExpiredCodeException') {
                errorMessage = 'Verification code has expired. Please request a new code.';
                setErrors({code: errorMessage});
            } else if (cognitoError.name === 'LimitExceededException') {
                errorMessage = 'Too many attempts. Please try again later.';
                setErrors({general: errorMessage});
            } else if (cognitoError.name === 'NotAuthorizedException') {
                errorMessage = 'User is already verified or does not exist.';
                setErrors({general: errorMessage});
            } else if (cognitoError.name === 'UserNotFoundException') {
                errorMessage = 'User not found. Please sign up first.';
                setErrors({general: errorMessage});
            } else {
                setErrors({general: cognitoError.message || errorMessage});
            }

            // Clear the code input on error
            setFormData((prev) => ({...prev, code: ''}));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (!canResend) return;

        setIsResending(true);
        setErrors({});

        try {
            await resendSignUpCode({
                username: formData.email,
            });

            console.log('Verification code resent successfully');

            // Start countdown
            setResendCountdown(RESEND_COOLDOWN);

            // Show success message briefly
            setErrors({general: undefined});
        } catch (error) {
            const cognitoError = error as CognitoError;
            console.error('Resend code error:', cognitoError);

            let errorMessage = 'Failed to resend code. Please try again.';

            if (cognitoError.name === 'LimitExceededException') {
                errorMessage = 'Too many requests. Please wait before requesting another code.';
            } else if (cognitoError.name === 'UserNotFoundException') {
                errorMessage = 'User not found. Please sign up first.';
            } else if (cognitoError.name === 'InvalidParameterException') {
                errorMessage = 'User is already verified.';
            }

            setErrors({general: errorMessage});
        } finally {
            setIsResending(false);
        }
    };

    return {
        formData,
        errors,
        isLoading,
        isSuccess,
        isResending,
        canResend,
        resendCountdown,
        handleCodeChange,
        handleSubmit,
        handleResendCode,
        clearError,
    };
};
