import React, {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../hooks/useAuth';

export const LandingPage: React.FC = () => {
    const {isLoading, isAuthenticated, user} = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Wait for authentication state to be determined
        if (isLoading) {
            console.log('[LandingPage] Still loading authentication state...');
            return;
        }

        if (!isAuthenticated) {
            console.log('[LandingPage] Not authenticated, redirecting to login');
            navigate('/login', {replace: true});
            return;
        }

        // Derive roles from user data directly (not from memoized functions)
        const userGroups = user?.groups || [];

        console.log('[LandingPage] User object:', user);
        console.log('[LandingPage] User groups:', userGroups);
        console.log('[LandingPage] User email:', user?.email);

        // Validate user data
        if (!user) {
            console.warn('[LandingPage] User object is null despite isAuthenticated=true');
            navigate('/dashboard', {replace: true});
            return;
        }

        // Role-based redirect logic using direct string comparison
        // Priority: Admin > Instructor > Student
        if (userGroups.includes('Admin')) {
            console.log('[LandingPage] ✓ Admin role detected, redirecting to /admin/dashboard');
            navigate('/admin/dashboard', {replace: true});
        } else if (userGroups.includes('Instructor')) {
            console.log('[LandingPage] ✓ Instructor role detected, redirecting to /instructor/dashboard');
            navigate('/instructor/dashboard', {replace: true});
        } else if (userGroups.includes('Student')) {
            console.log('[LandingPage] ✓ Student role detected, redirecting to /dashboard');
            navigate('/dashboard', {replace: true});
        } else {
            console.warn('[LandingPage] ⚠ No recognized role found, defaulting to student dashboard');
            console.warn('[LandingPage] User groups:', userGroups);
            navigate('/dashboard', {replace: true});
        }
    }, [isLoading, isAuthenticated, user, navigate]);

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
