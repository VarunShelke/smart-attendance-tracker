import React, {useEffect, useState} from 'react';
import {Link, useLocation} from 'react-router-dom';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import {useLoginForm} from '../../hooks/useLoginForm';
import {useAuth} from '../../contexts/AuthContext';

const LoginForm: React.FC = () => {
    const location = useLocation();
    const {isAuthenticated} = useAuth();
    const {
        formData,
        errors,
        isLoading,
        handleChange,
        handleSubmit,
        clearError,
    } = useLoginForm();

    const [showPassword, setShowPassword] = useState(false);
    const [showSuccessBanner, setShowSuccessBanner] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        // Check if user was redirected from verification page
        if (location.state?.verificationSuccess) {
            setSuccessMessage('Your email has been verified successfully! You can now sign in.');
            setShowSuccessBanner(true);
            // Clear the state to prevent showing banner on refresh
            window.history.replaceState({}, document.title);
        } else if (location.state?.signupSuccess) {
            setSuccessMessage('Account created successfully! Please sign in.');
            setShowSuccessBanner(true);
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // This should be handled by routing, but just in case
    if (isAuthenticated) {
        return null;
    }

    return (
        <div className="w-full max-w-lg">
            <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                    <p className="text-gray-600">Sign in to your account</p>
                </div>

                {showSuccessBanner && (
                    <div className="mb-6">
                        <Alert
                            type="success"
                            message={successMessage}
                            onClose={() => setShowSuccessBanner(false)}
                        />
                    </div>
                )}

                {errors.general && (
                    <div className="mb-6">
                        <Alert
                            type="error"
                            message={errors.general}
                            onClose={() => clearError('general')}
                        />
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="john.doe@example.com"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        error={errors.email}
                        disabled={isLoading}
                        autoComplete="email"
                        required
                    />

                    <div className="relative">
                        <Input
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            error={errors.password}
                            disabled={isLoading}
                            autoComplete="current-password"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 transition-colors"
                            tabIndex={-1}
                        >
                            {showPassword ? (
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                    />
                                </svg>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center justify-start gap-8">
                        <label className="flex items-center cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={formData.rememberMe}
                                    onChange={(e) => handleChange('rememberMe', e.target.checked)}
                                    disabled={isLoading}
                                    className="sr-only peer"
                                />
                                <div
                                    className="w-5 h-5 border-2 border-gray-300 rounded bg-white peer-checked:bg-primary-600 peer-checked:border-primary-600 transition-all duration-200 flex items-center justify-center group-hover:border-primary-400 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed">
                                    {formData.rememberMe && (
                                        <svg
                                            className="w-3.5 h-3.5 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={3}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                    )}
                                </div>
                            </div>
                            <span className="ml-2 text-sm text-gray-600">Remember me</span>
                        </label>

                        <button
                            type="button"
                            className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                            disabled={isLoading}
                        >
                            Forgot password?
                        </button>
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        isLoading={isLoading}
                    >
                        Sign In
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Don't have an account?{' '}
                        <Link
                            to="/signup"
                            className="font-medium text-primary-600 hover:text-primary-700 transition-colors"
                        >
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;
