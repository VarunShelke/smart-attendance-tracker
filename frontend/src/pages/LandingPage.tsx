import React, {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../hooks/useAuth';
import {UserRole} from '../types/auth';

export const LandingPage: React.FC = () => {
    const {isLoading, isAuthenticated, hasRole} = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoading) return;

        if (!isAuthenticated) {
            navigate('/login', {replace: true});
            return;
        }

        // Role-based redirect logic
        // Priority: Admin > Instructor > Student
        if (hasRole(UserRole.ADMIN)) {
            navigate('/admin/dashboard', {replace: true});
        } else if (hasRole(UserRole.INSTRUCTOR)) {
            navigate('/instructor/dashboard', {replace: true});
        } else if (hasRole(UserRole.STUDENT)) {
            navigate('/dashboard', {replace: true});
        } else {
            // User has no recognized role, redirect to student dashboard by default
            navigate('/dashboard', {replace: true});
        }
    }, [isLoading, isAuthenticated, hasRole, navigate]);

    // Show loading state while determining redirect
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Redirecting...</p>
            </div>
        </div>
    );
};
