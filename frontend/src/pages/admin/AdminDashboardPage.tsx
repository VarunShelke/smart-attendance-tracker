import React from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../../hooks/useAuth';

export const AdminDashboardPage: React.FC = () => {
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
                        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
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
                        You are signed in as an Administrator. Use the tools below to manage the system.
                    </p>
                </div>

                {/* Admin Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Manage Universities Card */}
                    <Link
                        to="/admin/universities"
                        className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-blue-600"
                    >
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Universities</h3>
                                <p className="text-sm text-gray-600">
                                    Add and update university information
                                </p>
                            </div>
                        </div>
                    </Link>

                    {/* Manage Schedules Card */}
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
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Schedules</h3>
                                <p className="text-sm text-gray-600">
                                    Add and update class schedules
                                </p>
                            </div>
                        </div>
                    </Link>

                    {/* View Students Card (Placeholder) */}
                    <div className="bg-white rounded-lg shadow-md p-6 opacity-60 border-l-4 border-gray-400">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">View Students</h3>
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
