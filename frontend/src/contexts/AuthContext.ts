import {createContext} from 'react';
import type {User} from '../types/auth';
import {UserRole} from '../types/auth';

export interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    refreshUser: () => Promise<void>;
    signOut: () => Promise<void>;
    hasRole: (role: UserRole) => boolean;
    hasAnyRole: (roles: UserRole[]) => boolean;
    getUserRoles: () => UserRole[];
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
