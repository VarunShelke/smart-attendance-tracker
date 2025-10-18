export const validateEmail = (email: string): string | null => {
    if (!email) {
        return 'Email is required';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'Please enter a valid email address';
    }

    return null;
};

export const validatePassword = (password: string): string | null => {
    if (!password) {
        return 'Password is required';
    }

    if (password.length < 8) {
        return 'Password must be at least 8 characters long';
    }

    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least one uppercase letter';
    }

    if (!/[a-z]/.test(password)) {
        return 'Password must contain at least one lowercase letter';
    }

    if (!/[0-9]/.test(password)) {
        return 'Password must contain at least one number';
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return 'Password must contain at least one special character';
    }

    return null;
};

export const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
    if (!confirmPassword) {
        return 'Please confirm your password';
    }

    if (password !== confirmPassword) {
        return 'Passwords do not match';
    }

    return null;
};

export const validateName = (name: string, fieldName: string = 'Name'): string | null => {
    if (!name || name.trim().length === 0) {
        return `${fieldName} is required`;
    }

    if (name.trim().length < 2) {
        return `${fieldName} must be at least 2 characters long`;
    }

    if (!/^[a-zA-Z\s'-]+$/.test(name)) {
        return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
    }

    return null;
};
