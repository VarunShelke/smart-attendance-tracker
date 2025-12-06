import React, {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import {useAuth} from '../hooks/useAuth';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const {isAuthenticated, isLoading} = useAuth();

    useEffect(() => {
        // Redirect to dashboard if already logged in
        if (!isLoading && isAuthenticated) {
            navigate('/dashboard', {replace: true});
        }
    }, [isAuthenticated, isLoading, navigate]);

    // Show nothing while checking auth status
    if (isLoading) {
        return (
            <div
                className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    // Don't render login form if already authenticated (will redirect)
    if (isAuthenticated) {
        return null;
    }

    return (
        <div
            className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center px-4 py-12">
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
            <div className="relative z-10">
                <LoginForm/>
            </div>
        </div>
    );
};

export default LoginPage;
