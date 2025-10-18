export interface SignupFormData {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
}

export interface SignupFormErrors {
    email?: string;
    password?: string;
    confirmPassword?: string;
    firstName?: string;
    lastName?: string;
    general?: string;
}

export interface AuthResponse {
    success: boolean;
    message?: string;
    userId?: string;
}

export interface CognitoError {
    name: string;
    message: string;
}

export interface VerifyEmailFormData {
    email: string;
    code: string;
}

export interface VerifyEmailFormErrors {
    code?: string;
    general?: string;
}

export interface LoginFormData {
    email: string;
    password: string;
    rememberMe: boolean;
}

export interface LoginFormErrors {
    email?: string;
    password?: string;
    general?: string;
}

export interface User {
    email: string;
    firstName?: string;
    lastName?: string;
    userId: string;
}
