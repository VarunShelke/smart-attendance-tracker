import type {ReactNode} from 'react';
import React, {createContext, useContext, useEffect, useState} from 'react';
import {fetchUserAttributes, getCurrentUser, signOut as amplifySignOut} from 'aws-amplify/auth';
import type {User} from '../types/auth';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    refreshUser: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadUser = async () => {
        try {
            setIsLoading(true);
            const currentUser = await getCurrentUser();
            const attributes = await fetchUserAttributes();

            setUser({
                userId: currentUser.userId,
                email: attributes.email || '',
                firstName: attributes.given_name,
                lastName: attributes.family_name,
            });
        } catch (error) {
            console.log('No authenticated user:', error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadUser();
    }, []);

    const refreshUser = async () => {
        await loadUser();
    };

    const signOut = async () => {
        try {
            await amplifySignOut();
            setUser(null);
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    };

    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated: user !== null,
        refreshUser,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
