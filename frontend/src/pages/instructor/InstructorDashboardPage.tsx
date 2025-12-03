import React from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../../hooks/useAuth';

export const InstructorDashboardPage: React.FC = () => {
    const {user, signOut} = useAuth();

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-900">Instructor Dashboard</h1>
                        <button
                            onClick={handleSignOut}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Welcome, {user?.firstName} {user?.lastName}!
                    </h2>
                    <p className="text-gray-600">
                        You are signed in as an Instructor. Use the tools below to manage your courses.
                    </p>
                </div>

                {/* Instructor Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Manage My Schedules Card */}
                    <Link
                        to="/admin/schedules"
                        className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-green-600"
                    >
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage My Schedules</h3>
                                <p className="text-sm text-gray-600">
                                    Add and update your class schedules
                                </p>
                            </div>
                        </div>
                    </Link>

                    {/* View Attendance Card (Placeholder) */}
                    <div className="bg-white rounded-lg shadow-md p-6 opacity-60 border-l-4 border-gray-400">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">View Attendance</h3>
                                <p className="text-sm text-gray-600">
                                    Coming soon...
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
