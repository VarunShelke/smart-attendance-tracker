import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../hooks/useAuth';
import Button from '../components/ui/Button';
import AttendanceCaptureModal from '../components/camera/AttendanceCaptureModal';

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const {user, signOut} = useAuth();
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSignOut = async () => {
        setIsSigningOut(true);
        try {
            await signOut();
            navigate('/login', {replace: true});
        } catch (error) {
            console.error('Error signing out:', error);
            setIsSigningOut(false);
        }
    };

    const getUserDisplayName = (): string => {
        if (user?.firstName && user?.lastName) {
            return `${user.firstName} ${user.lastName}`;
        } else if (user?.firstName) {
            return user.firstName;
        } else if (user?.email) {
            return user.email.split('@')[0];
        }
        return 'User';
    };

    const getUserInitials = (): string => {
        if (user?.firstName && user?.lastName) {
            return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
        } else if (user?.email) {
            return user.email.charAt(0).toUpperCase();
        }
        return 'U';
    };

    const handleAttendanceSuccess = (trackingId: string) => {
        setIsAttendanceModalOpen(false);
        setSuccessMessage(`Attendance submitted successfully! Tracking ID: ${trackingId}`);
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-2xl font-bold text-gray-900">
                            Smart Attendance Tracker
                        </h1>

                        <div className="flex items-center gap-4">
                            {/* Mark Attendance Button */}
                            <Button
                                variant="primary"
                                onClick={() => setIsAttendanceModalOpen(true)}
                                className="hidden sm:flex"
                            >
                                <svg
                                    className="w-5 h-5 mr-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                                Mark Attendance
                            </Button>

                            {/* Mobile Mark Attendance Button */}
                            <button
                                onClick={() => setIsAttendanceModalOpen(true)}
                                className="sm:hidden p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                            </button>

                            {/* User Menu */}
                            <div className="relative">
                                <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
                            >
                                <div
                                    className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                                    {getUserInitials()}
                                </div>
                                <div className="hidden md:block text-left">
                                    <p className="text-sm font-medium text-gray-900">
                                        {getUserDisplayName()}
                                    </p>
                                    <p className="text-xs text-gray-500">{user?.email}</p>
                                </div>
                                <svg
                                    className={`w-5 h-5 text-gray-400 transition-transform ${
                                        showUserMenu ? 'rotate-180' : ''
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {showUserMenu && (
                                <div
                                    className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                    <div className="px-4 py-3 border-b border-gray-200">
                                        <p className="text-sm font-medium text-gray-900">
                                            {getUserDisplayName()}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                    </div>

                                    <button
                                        onClick={handleSignOut}
                                        disabled={isSigningOut}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSigningOut ? 'Signing out...' : 'Sign out'}
                                    </button>
                                </div>
                            )}
                        </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow p-8">
                    <div className="text-center">
                        <div
                            className="mx-auto w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                            <svg
                                className="w-10 h-10 text-primary-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>

                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                            Welcome, {user?.firstName || 'User'}! 👋
                        </h2>
                        <p className="text-gray-600 mb-6">
                            You have successfully logged in to Smart Attendance Tracker
                        </p>

                        <div className="max-w-md mx-auto bg-gray-50 rounded-lg p-6 mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                Your Account Info
                            </h3>
                            <div className="space-y-2 text-left">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Email:</span>
                                    <span className="font-medium text-gray-900">{user?.email}</span>
                                </div>
                                {user?.firstName && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">First Name:</span>
                                        <span className="font-medium text-gray-900">{user.firstName}</span>
                                    </div>
                                )}
                                {user?.lastName && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Last Name:</span>
                                        <span className="font-medium text-gray-900">{user.lastName}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-600">User ID:</span>
                                    <span className="font-mono text-sm text-gray-900">
                    {user?.userId.substring(0, 8)}...
                  </span>
                                </div>
                            </div>
                        </div>

                        <div className="text-gray-600">
                            <p className="mb-4">Dashboard features coming soon...</p>
                            <Button
                                variant="outline"
                                onClick={handleSignOut}
                                isLoading={isSigningOut}
                            >
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Success Toast Message */}
            {successMessage && (
                <div className="fixed bottom-4 right-4 max-w-md z-50">
                    <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-start gap-3">
                        <svg
                            className="w-6 h-6 flex-shrink-0 mt-0.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <div className="flex-1">
                            <p className="font-medium">{successMessage}</p>
                        </div>
                        <button
                            onClick={() => setSuccessMessage(null)}
                            className="text-white hover:text-gray-200 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Attendance Capture Modal */}
            <AttendanceCaptureModal
                isOpen={isAttendanceModalOpen}
                onClose={() => setIsAttendanceModalOpen(false)}
                onSuccess={handleAttendanceSuccess}
            />
        </div>
    );
};

export default DashboardPage;
