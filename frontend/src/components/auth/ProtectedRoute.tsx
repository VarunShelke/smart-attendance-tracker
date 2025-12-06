import React from 'react';
import {Navigate} from 'react-router-dom';
import {useAuth} from '../../hooks/useAuth';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({children}) => {
    const {isAuthenticated, isLoading} = useAuth();

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace/>;
    }

    // Render children if authenticated
    return <>{children}</>;
};

export default ProtectedRoute;
