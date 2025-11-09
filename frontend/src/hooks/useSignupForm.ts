import type {FormEvent} from 'react';
import {useState} from 'react';
import {resendSignUpCode, signUp} from 'aws-amplify/auth';
import {useNavigate} from 'react-router-dom';
import type {CognitoError, SignupFormData, SignupFormErrors} from '../types/auth';
import {validateConfirmPassword, validateEmail, validateName, validatePassword,} from '../utils/validation';

interface UseSignupFormReturn {
    formData: SignupFormData;
    errors: SignupFormErrors;
    isLoading: boolean;
    isSuccess: boolean;
    handleChange: (field: keyof SignupFormData, value: string) => void;
    handleSubmit: (e: FormEvent) => Promise<void>;
    clearError: (field: keyof SignupFormErrors) => void;
}

export const useSignupForm = (): UseSignupFormReturn => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState<SignupFormData>({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: '',
    });

    const [errors, setErrors] = useState<SignupFormErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleChange = (field: keyof SignupFormData, value: string) => {
        setFormData((prev) => ({...prev, [field]: value}));
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors((prev) => ({...prev, [field]: undefined}));
        }
    };

    const clearError = (field: keyof SignupFormErrors) => {
        setErrors((prev) => ({...prev, [field]: undefined}));
    };

    const validateForm = (): boolean => {
        const newErrors: SignupFormErrors = {};

        const emailError = validateEmail(formData.email);
        if (emailError) newErrors.email = emailError;

        const passwordError = validatePassword(formData.password);
        if (passwordError) newErrors.password = passwordError;

        const confirmPasswordError = validateConfirmPassword(
            formData.password,
            formData.confirmPassword
        );
        if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

        const firstNameError = validateName(formData.firstName, 'First name');
        if (firstNameError) newErrors.firstName = firstNameError;

        const lastNameError = validateName(formData.lastName, 'Last name');
        if (lastNameError) newErrors.lastName = lastNameError;

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
            const {isSignUpComplete, userId, nextStep} = await signUp({
                username: formData.email,
                password: formData.password,
                options: {
                    userAttributes: {
                        email: formData.email,
                        given_name: formData.firstName,
                        family_name: formData.lastName,
                    },
                },
            });

            console.log('Sign up successful:', {isSignUpComplete, userId, nextStep});
            setIsSuccess(true);

            // Navigate to verification page if email confirmation is required
            if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
                navigate('/verify-email', {
                    state: {
                        email: formData.email,
                        password: formData.password, // Pass password for auto-login after face registration
                        userId: userId, // Pass userId for S3 filename
                    },
                });
            } else if (isSignUpComplete) {
                // If sign up is complete without verification (unlikely with email verification enabled)
                navigate('/login', {
                    state: {signupSuccess: true},
                });
            }
        } catch (error) {
            const cognitoError = error as CognitoError;
            console.error('Sign up error:', cognitoError);

            // Map Cognito errors to user-friendly messages
            let errorMessage = 'An error occurred during signup. Please try again.';

            if (cognitoError.name === 'UsernameExistsException') {
                // User might exist but not be verified - redirect them to verification
                try {
                    // Try to resend verification code
                    await resendSignUpCode({username: formData.email});
                    // If successful, it means user exists but isn't verified
                    navigate('/verify-email', {
                        state: {email: formData.email},
                    });
                    return;
                } catch {
                    // If resend fails, the user is already verified
                    errorMessage = 'An account with this email already exists. Please sign in.';
                    setErrors({email: errorMessage});
                }
            } else if (cognitoError.name === 'InvalidPasswordException') {
                errorMessage = 'Password does not meet requirements.';
                setErrors({password: errorMessage});
            } else if (cognitoError.name === 'InvalidParameterException') {
                errorMessage = 'Please check your input and try again.';
                setErrors({general: errorMessage});
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
        isSuccess,
        handleChange,
        handleSubmit,
        clearError,
    };
};
