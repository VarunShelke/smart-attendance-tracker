import React, {useEffect} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import EmailVerificationForm from '../components/auth/EmailVerificationForm';

interface VerifyEmailLocationState {
    email?: string;
    password?: string;
}

const VerifyEmailPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as VerifyEmailLocationState | null;
    const email = state?.email;
    const password = state?.password;

    // Redirect to signup if no email is provided
    useEffect(() => {
        if (!email) {
            navigate('/signup', {replace: true});
        }
    }, [email, navigate]);

    // Don't render anything if email is not available (will redirect)
    if (!email) {
        return null;
    }

    return (
        <div
            className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center px-4 py-12">
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
            <div className="relative z-10">
                <EmailVerificationForm email={email} password={password}/>
            </div>
        </div>
    );
};

export default VerifyEmailPage;
