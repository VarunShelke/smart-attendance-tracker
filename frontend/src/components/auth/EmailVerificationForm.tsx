import React, {useEffect, useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import OTPInput from '../ui/OTPInput';
import {useVerifyEmail} from '../../hooks/useVerifyEmail';

interface EmailVerificationFormProps {
    email: string;
    password?: string;
}

const EmailVerificationForm: React.FC<EmailVerificationFormProps> = ({email, password}) => {
    const navigate = useNavigate();
    const hasNavigated = useRef(false); // Track if we've already navigated
    const {
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
    } = useVerifyEmail(email, password);

    /**
     * Redirect to face registration after successful verification and sign-in
     *
     * After email verification, the user is signed in properly with a complete session.
     * We navigate immediately to face registration. The AuthProvider will automatically
     * load the user when the new page mounts, so we don't need to manually refresh.
     *
     * This avoids the infinite loop issue that was caused by calling refreshUser(),
     * which would trigger re-renders and repeated API calls.
     */
    useEffect(() => {
        if (!isSuccess || hasNavigated.current) return;

        // Mark that we're navigating to prevent multiple navigation attempts
        hasNavigated.current = true;

        // Add a small delay to ensure the success message is visible
        const timer = setTimeout(() => {
            console.log('Navigating to face registration');
            navigate('/face-registration', {
                state: {
                    email,
                },
            });
        }, 1000);

        return () => clearTimeout(timer);
    }, [isSuccess, navigate, email]);

    // Mask email for privacy (show first char and domain)
    const maskEmail = (email: string): string => {
        const [localPart, domain] = email.split('@');
        if (!domain) return email;
        const maskedLocal = localPart.charAt(0) + '***';
        return `${maskedLocal}@${domain}`;
    };

    return (
        <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-8">
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
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
                    <p className="text-gray-600">
                        We've sent a verification code to
                    </p>
                    <p className="text-gray-900 font-medium mt-1">{maskEmail(email)}</p>
                </div>

                {errors.general && (
                    <div className="mb-6">
                        <Alert
                            type="error"
                            message={errors.general}
                            onClose={() => clearError('general')}
                        />
                    </div>
                )}

                {isSuccess && (
                    <div className="mb-6">
                        <Alert
                            type="success"
                            message="Email verified and signed in successfully! Redirecting to face registration..."
                        />
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                            Enter Verification Code
                        </label>
                        <OTPInput
                            length={6}
                            value={formData.code}
                            onChange={handleCodeChange}
                            disabled={isLoading || isSuccess}
                            error={errors.code}
                        />
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        isLoading={isLoading}
                        disabled={isSuccess || formData.code.length !== 6}
                    >
                        {isSuccess ? 'Verified!' : 'Verify Email'}
                    </Button>

                    <div className="text-center">
                        <p className="text-sm text-gray-600 mb-2">
                            Didn't receive the code?
                        </p>
                        <button
                            type="button"
                            onClick={handleResendCode}
                            disabled={!canResend || isSuccess}
                            className={`text-sm font-medium transition-colors ${
                                canResend && !isSuccess
                                    ? 'text-primary-600 hover:text-primary-700 cursor-pointer'
                                    : 'text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {isResending
                                ? 'Sending...'
                                : resendCountdown > 0
                                    ? `Resend code in ${resendCountdown}s`
                                    : 'Resend verification code'}
                        </button>
                    </div>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-sm text-gray-600 text-center">
                        Need help?{' '}
                        <button
                            type="button"
                            onClick={() => navigate('/signup')}
                            className="font-medium text-primary-600 hover:text-primary-700 transition-colors"
                            disabled={isLoading || isSuccess}
                        >
                            Back to Sign Up
                        </button>
                    </p>
                </div>
            </div>

            <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                    Check your spam folder if you don't see the email
                </p>
            </div>
        </div>
    );
};

export default EmailVerificationForm;
