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
    groups?: string[]; // Cognito groups/roles
}

export const UserRole = {
    ADMIN: 'Admin',
    INSTRUCTOR: 'Instructor',
    STUDENT: 'Student'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export interface NewPasswordFormData {
    newPassword: string;
    confirmPassword: string;
    givenName: string;
    familyName: string;
}

export interface NewPasswordFormErrors {
    newPassword?: string;
    confirmPassword?: string;
    givenName?: string;
    familyName?: string;
    general?: string;
}

export interface SignInChallengeState {
    challengeType: 'NEW_PASSWORD_REQUIRED' | 'MFA_CODE' | null;
    missingAttributes?: string[];
}

export interface CompleteSignInState {
    email: string;
    challengeType: string;
    missingAttributes?: string[];
}

export interface FaceRegistrationState {
    isCapturing: boolean;
    isUploading: boolean;
    capturedImage: string | null;
    error: string | null;
    success: boolean;
}

export interface CameraStream {
    stream: MediaStream | null;
    videoRef: HTMLVideoElement | null;
}
