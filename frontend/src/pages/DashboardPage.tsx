import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../hooks/useAuth';
import AttendanceCaptureModal from '../components/camera/AttendanceCaptureModal';
import CoursesList from '../components/courses/CoursesList';
import type {Course} from '../types/course';

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const {user, signOut} = useAuth();
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

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

    const handleRegisterAttendance = (course: Course) => {
        setSelectedCourse(course);
        setIsAttendanceModalOpen(true);
    };

    const handleAttendanceModalClose = () => {
        setIsAttendanceModalOpen(false);
        setSelectedCourse(null);
    };

    const handleAttendanceSuccess = (trackingId: string) => {
        setIsAttendanceModalOpen(false);
        setSelectedCourse(null);
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
                        <div className="flex items-center">
                            <img
                                src="/favicon.png"
                                alt="Smart Attendance Tracker"
                                className="h-8 w-auto"
                            />
                        </div>

                        <div className="flex items-center gap-4">
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
                                        onClick={() => {
                                            setShowUserMenu(false);
                                            navigate('/profile');
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
                                    >
                                        <svg
                                            className="w-4 h-4 mr-3 text-gray-500"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                            />
                                        </svg>
                                        View Profile
                                    </button>

                                    <div className="border-t border-gray-200 my-1"></div>

                                    <button
                                        onClick={handleSignOut}
                                        disabled={isSigningOut}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                    >
                                        <svg
                                            className="w-4 h-4 mr-3 text-red-600"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                            />
                                        </svg>
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
                <CoursesList onRegisterAttendance={handleRegisterAttendance}/>
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
                onClose={handleAttendanceModalClose}
                onSuccess={handleAttendanceSuccess}
                course={selectedCourse || undefined}
            />
        </div>
    );
};

export default DashboardPage;
