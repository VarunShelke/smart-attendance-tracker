import React from 'react';
import {Navigate} from 'react-router-dom';
import {useAuth} from '../../hooks/useAuth';
import {UserRole} from '../../types/auth';

interface RoleProtectedRouteProps {
    children: React.ReactElement;
    requiredRoles: UserRole[];
    redirectTo?: string;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
    children,
    requiredRoles,
    redirectTo = '/dashboard',
}) => {
    const {isLoading, isAuthenticated, hasAnyRole} = useAuth();

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check if user has any of the required roles
    if (!hasAnyRole(requiredRoles)) {
        // User is authenticated but doesn't have required role
        return <Navigate to={redirectTo} replace />;
    }

    // User has required role, render the protected content
    return children;
};
