import type {ReactNode} from 'react';
import React, {useCallback, useEffect, useState} from 'react';
import {fetchUserAttributes, getCurrentUser, signOut as amplifySignOut} from 'aws-amplify/auth';
import type {User} from '../types/auth';
import {AuthContext, type AuthContextType} from './AuthContext';

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Memoize loadUser to prevent recreating the function on every render
    const loadUser = useCallback(async () => {
        try {
            setIsLoading(true);

            // Get current user first
            const currentUser = await getCurrentUser();

            // Then fetch attributes - this may fail if session is incomplete
            const attributes = await fetchUserAttributes();

            setUser({
                userId: currentUser.userId,
                email: attributes.email || '',
                firstName: attributes.given_name,
                lastName: attributes.family_name,
            });
        } catch (error) {
            // Handle different error scenarios
            const err = error as {name?: string; message?: string};

            // Expected errors when no user is authenticated
            if (err.name === 'UserUnAuthenticatedException' ||
                err.name === 'UserNotFoundException' ||
                err.name === 'NotAuthorizedException') {
                // User is not authenticated - this is expected, don't log
                setUser(null);
            }
            // Handle incomplete session state (can happen after confirmSignUp)
            else if (err.name === 'InvalidParameterException' ||
                     err.message?.includes('400')) {
                // Session might be incomplete - log but don't crash
                console.warn('Incomplete auth session detected, user state will be null:', err.message);
                setUser(null);
            }
            // Unexpected errors
            else {
                console.error('Unexpected error loading user:', error);
                setUser(null);
            }
        } finally {
            setIsLoading(false);
        }
    }, []); // Empty dependency array since this doesn't depend on any props or state

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    // Memoize refreshUser to prevent recreating the function on every render
    const refreshUser = useCallback(async () => {
        await loadUser();
    }, [loadUser]);

    // Memoize signOut to prevent recreating the function on every render
    const signOut = useCallback(async () => {
        try {
            await amplifySignOut();
            setUser(null);
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    }, []);

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: user !== null,
        refreshUser,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
