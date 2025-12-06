import React, {useState} from 'react';
import type {NewPasswordFormData, NewPasswordFormErrors} from '../../types/auth';
import {validatePassword, validatePasswordMatch, getPasswordStrengthColor, getPasswordStrengthLabel} from '../../utils/passwordValidation';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Alert from '../ui/Alert';

interface NewPasswordRequiredFormProps {
    email: string;
    missingAttributes?: string[];
    onSubmit: (data: NewPasswordFormData) => Promise<void>;
    isLoading: boolean;
    error?: string;
}

export const NewPasswordRequiredForm: React.FC<NewPasswordRequiredFormProps> = ({
    email,
    missingAttributes = [],
    onSubmit,
    isLoading,
    error,
}) => {
    const [formData, setFormData] = useState<NewPasswordFormData>({
        newPassword: '',
        confirmPassword: '',
        givenName: '',
        familyName: '',
    });

    const [errors, setErrors] = useState<NewPasswordFormErrors>({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

    const handleInputChange = (field: keyof NewPasswordFormData, value: string) => {
        setFormData(prev => ({...prev, [field]: value}));

        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({...prev, [field]: undefined}));
        }

        // Update password strength as user types
        if (field === 'newPassword') {
            const validation = validatePassword(value);
            setPasswordStrength(validation.strength);
        }
    };

    const validateForm = (): boolean => {
        const newErrors: NewPasswordFormErrors = {};

        // Validate new password
        const passwordValidation = validatePassword(formData.newPassword);
        if (!passwordValidation.isValid) {
            newErrors.newPassword = passwordValidation.errors[0]; // Show first error
        }

        // Validate password confirmation
        const confirmError = validatePasswordMatch(formData.newPassword, formData.confirmPassword);
        if (confirmError) {
            newErrors.confirmPassword = confirmError;
        }

        // Validate required attributes
        if (missingAttributes.includes('given_name') && !formData.givenName.trim()) {
            newErrors.givenName = 'First name is required';
        }

        if (missingAttributes.includes('family_name') && !formData.familyName.trim()) {
            newErrors.familyName = 'Last name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        await onSubmit(formData);
    };

    const needsGivenName = missingAttributes.includes('given_name');
    const needsFamilyName = missingAttributes.includes('family_name');

    return (
        <div className="w-full max-w-lg">
            <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Set New Password</h1>
                    <p className="text-gray-600">
                        Welcome! Please set a new password for your account.
                    </p>
                    <p className="text-sm text-gray-500 mt-2">{email}</p>
                </div>

                {error && (
                    <div className="mb-6">
                        <Alert type="error" message={error} />
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* New Password */}
                    <div>
                        <div className="relative">
                            <Input
                                label="New Password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter new password"
                                value={formData.newPassword}
                                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                                error={errors.newPassword}
                                disabled={isLoading}
                                autoComplete="new-password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        {/* Password Strength Indicator */}
                        {formData.newPassword && (
                            <div className="mt-2">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-600">Password strength:</span>
                                    <span className={`text-xs font-medium ${getPasswordStrengthColor(passwordStrength)}`}>
                                        {getPasswordStrengthLabel(passwordStrength)}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div
                                        className={`h-1.5 rounded-full transition-all ${
                                            passwordStrength === 'strong' ? 'bg-green-600 w-full' :
                                            passwordStrength === 'medium' ? 'bg-yellow-600 w-2/3' :
                                            'bg-red-600 w-1/3'
                                        }`}
                                    />
                                </div>
                            </div>
                        )}

                        <p className="mt-2 text-xs text-gray-500">
                            Password must be at least 8 characters and contain uppercase, lowercase, number, and special character.
                        </p>
                    </div>

                    {/* Confirm Password */}
                    <div className="relative">
                        <Input
                            label="Confirm New Password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirm new password"
                            value={formData.confirmPassword}
                            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                            error={errors.confirmPassword}
                            disabled={isLoading}
                            autoComplete="new-password"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 transition-colors"
                            tabIndex={-1}
                        >
                            {showConfirmPassword ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    {/* First Name (if required) */}
                    {needsGivenName && (
                        <Input
                            label="First Name"
                            type="text"
                            placeholder="Enter your first name"
                            value={formData.givenName}
                            onChange={(e) => handleInputChange('givenName', e.target.value)}
                            error={errors.givenName}
                            disabled={isLoading}
                            autoComplete="given-name"
                            required
                        />
                    )}

                    {/* Last Name (if required) */}
                    {needsFamilyName && (
                        <Input
                            label="Last Name"
                            type="text"
                            placeholder="Enter your last name"
                            value={formData.familyName}
                            onChange={(e) => handleInputChange('familyName', e.target.value)}
                            error={errors.familyName}
                            disabled={isLoading}
                            autoComplete="family-name"
                            required
                        />
                    )}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        isLoading={isLoading}
                    >
                        Set Password and Continue
                    </Button>
                </form>
            </div>
        </div>
    );
};
