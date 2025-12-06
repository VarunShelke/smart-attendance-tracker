/**
 * Password Validation Utilities
 *
 * Utilities for validating password strength and requirements.
 * Follows AWS Cognito default password policy:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 *
 * @module utils/passwordValidation
 */

export interface PasswordValidationResult {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
}

/**
 * Validate password against Cognito requirements
 */
export function validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let strength: 'weak' | 'medium' | 'strong' = 'weak';

    // Check minimum length
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }

    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    // Check for number
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    // Check for special character
    if (!/[^A-Za-z0-9]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    // Calculate strength
    if (errors.length === 0) {
        if (password.length >= 12 && /[^A-Za-z0-9]/.test(password)) {
            strength = 'strong';
        } else if (password.length >= 10) {
            strength = 'medium';
        } else {
            strength = 'medium';
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        strength,
    };
}

/**
 * Validate password confirmation matches
 */
export function validatePasswordMatch(password: string, confirmPassword: string): string | undefined {
    if (!confirmPassword) {
        return 'Please confirm your password';
    }

    if (password !== confirmPassword) {
        return 'Passwords do not match';
    }

    return undefined;
}

/**
 * Get password strength color for UI
 */
export function getPasswordStrengthColor(strength: 'weak' | 'medium' | 'strong'): string {
    switch (strength) {
        case 'weak':
            return 'text-red-600';
        case 'medium':
            return 'text-yellow-600';
        case 'strong':
            return 'text-green-600';
        default:
            return 'text-gray-600';
    }
}

/**
 * Get password strength label for UI
 */
export function getPasswordStrengthLabel(strength: 'weak' | 'medium' | 'strong'): string {
    switch (strength) {
        case 'weak':
            return 'Weak';
        case 'medium':
            return 'Medium';
        case 'strong':
            return 'Strong';
        default:
            return '';
    }
}
