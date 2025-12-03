import type {ReactNode} from 'react';
import React, {useCallback, useEffect, useState} from 'react';
import {fetchUserAttributes, getCurrentUser, signOut as amplifySignOut, fetchAuthSession} from 'aws-amplify/auth';
import type {User} from '../types/auth';
import {UserRole} from '../types/auth';
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

            // Fetch auth session to get ID token with groups
            const session = await fetchAuthSession();
            const idToken = session.tokens?.idToken;

            // Extract groups from ID token payload
            let groups: string[] = [];
            if (idToken?.payload?.['cognito:groups']) {
                const cognitoGroups = idToken.payload['cognito:groups'];
                if (Array.isArray(cognitoGroups)) {
                    groups = cognitoGroups as string[];
                } else if (typeof cognitoGroups === 'string') {
                    groups = [cognitoGroups];
                }
            }

            setUser({
                userId: currentUser.userId,
                email: attributes.email || '',
                firstName: attributes.given_name,
                lastName: attributes.family_name,
                groups,
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

    // Role helper functions
    const getUserRoles = useCallback((): UserRole[] => {
        if (!user?.groups) return [];
        return user.groups.filter(group =>
            Object.values(UserRole).includes(group as UserRole)
        ) as UserRole[];
    }, [user]);

    const hasRole = useCallback((role: UserRole): boolean => {
        return getUserRoles().includes(role);
    }, [getUserRoles]);

    const hasAnyRole = useCallback((roles: UserRole[]): boolean => {
        const userRoles = getUserRoles();
        return roles.some(role => userRoles.includes(role));
    }, [getUserRoles]);

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: user !== null,
        refreshUser,
        signOut,
        hasRole,
        hasAnyRole,
        getUserRoles,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
