import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {getStudentProfile, updateStudentProfile, ApiError} from '../services/api';
import type {StudentProfile} from '../types/student';
import Button from '../components/ui/Button';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [studentId, setStudentId] = useState<string>('');
    const [phoneNumber, setPhoneNumber] = useState<string>('');
    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [updateError, setUpdateError] = useState<string | null>(null);

    // Fetch profile on component mount
    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await getStudentProfile();
            setProfile(data);
            setStudentId(data.student_id || '');
            setPhoneNumber(data.phone_number || '');
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Failed to load profile. Please try again.');
            }
            console.error('Error fetching profile:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePhoneNumberChange = (value: string) => {
        setPhoneNumber(value);

        // Validate phone number format
        if (value && !/^\+?\d{10,15}$/.test(value.replace(/[\s\-\(\)\.]/g, ''))) {
            setPhoneError('Phone number must contain 10-15 digits and may start with +');
        } else {
            setPhoneError(null);
        }
    };

    const handleUpdateProfile = async () => {
        // Clear previous messages
        setSuccessMessage(null);
        setUpdateError(null);

        // Validate phone number if provided
        if (phoneError) {
            setUpdateError('Please fix the phone number format before updating.');
            return;
        }

        // Check if there are any changes
        const hasStudentIdChange =
            studentId !== (profile?.student_id || '') &&
            !profile?.student_id;
        const hasPhoneNumberChange = phoneNumber !== (profile?.phone_number || '');

        if (!hasStudentIdChange && !hasPhoneNumberChange) {
            setUpdateError('No changes to save.');
            return;
        }

        setIsUpdating(true);

        try {
            // Build update data with only changed fields
            const updateData: {student_id?: string; phone_number?: string} = {};

            if (hasStudentIdChange) {
                updateData.student_id = studentId.trim();
            }

            if (hasPhoneNumberChange) {
                updateData.phone_number = phoneNumber.trim();
            }

            // Call API to update profile
            const updatedProfile = await updateStudentProfile(updateData);

            // Update local state with new profile data
            setProfile(updatedProfile);
            setStudentId(updatedProfile.student_id || '');
            setPhoneNumber(updatedProfile.phone_number || '');

            // Show success message
            setSuccessMessage('Profile updated successfully!');

            // Auto-hide success message after 5 seconds
            setTimeout(() => {
                setSuccessMessage(null);
            }, 5000);

        } catch (err) {
            if (err instanceof ApiError) {
                setUpdateError(err.message);
            } else {
                setUpdateError('Failed to update profile. Please try again.');
            }
            console.error('Error updating profile:', err);
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    <p className="mt-4 text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <svg
                                className="w-8 h-8 text-red-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                            Error Loading Profile
                        </h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <div className="space-y-3">
                            <Button variant="primary" onClick={fetchProfile} className="w-full">
                                Try Again
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => navigate('/dashboard')}
                                className="w-full"
                            >
                                Back to Dashboard
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center h-16">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                            aria-label="Back to dashboard"
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
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                            Back
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Success Message */}
                {successMessage && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
                        <svg
                            className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0"
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
                            <p className="text-sm font-medium text-green-800">{successMessage}</p>
                        </div>
                        <button
                            onClick={() => setSuccessMessage(null)}
                            className="text-green-600 hover:text-green-800 ml-3"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Error Message */}
                {updateError && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                        <svg
                            className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-red-800">{updateError}</p>
                        </div>
                        <button
                            onClick={() => setUpdateError(null)}
                            className="text-red-600 hover:text-red-800 ml-3"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow">
                    {/* Page Header */}
                    <div className="px-6 py-8 border-b border-gray-200">
                        <div className="flex items-center">
                            <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                                {profile.first_name.charAt(0)}
                                {profile.last_name.charAt(0)}
                            </div>
                            <div className="ml-4">
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {profile.first_name} {profile.last_name}
                                </h1>
                                <p className="text-gray-600">{profile.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Profile Form */}
                    <div className="px-6 py-8 space-y-8">
                        {/* Personal Information Section */}
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Personal Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* First Name (Read-only) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.first_name}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                                    />
                                </div>

                                {/* Last Name (Read-only) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.last_name}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                                    />
                                </div>

                                {/* Email (Read-only) */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={profile.email}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Academic Information Section */}
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Academic Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Student ID (Editable only if empty) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Student ID
                                        {!profile.student_id && (
                                            <span className="text-xs text-gray-500 ml-2">
                                                (Optional)
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        value={studentId}
                                        onChange={(e) => setStudentId(e.target.value)}
                                        disabled={!!profile.student_id || isUpdating}
                                        placeholder={!profile.student_id ? 'Enter your student ID' : ''}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                                            profile.student_id || isUpdating
                                                ? 'border-gray-300 bg-gray-50 text-gray-700 cursor-not-allowed'
                                                : 'border-gray-300 bg-white text-gray-900'
                                        }`}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Contact Information Section */}
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Contact Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Phone Number (Always editable) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Phone Number
                                        <span className="text-xs text-gray-500 ml-2">
                                            (Optional)
                                        </span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => handlePhoneNumberChange(e.target.value)}
                                        disabled={isUpdating}
                                        placeholder="Enter your phone number"
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                                            phoneError
                                                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                                                : 'border-gray-300'
                                        } ${isUpdating ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                                    />
                                    {phoneError && (
                                        <p className="mt-1 text-sm text-red-600">{phoneError}</p>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500">
                                        Format: 10-15 digits, optional + prefix (e.g., +1234567890)
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Account Status Section */}
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Account Status
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Face Registration Status */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Face Registration Status
                                    </label>
                                    <div className="flex items-center">
                                        {profile.face_registered ? (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                                <svg
                                                    className="w-4 h-4 mr-1.5"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                                Registered
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                                                <svg
                                                    className="w-4 h-4 mr-1.5"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                                Not Registered
                                            </span>
                                        )}
                                    </div>
                                    {profile.face_registered && profile.face_registered_at && (
                                        <p className="mt-2 text-sm text-gray-600">
                                            Registered on{' '}
                                            {new Date(profile.face_registered_at).toLocaleDateString(
                                                'en-US',
                                                {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                }
                                            )}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Actions */}
                    <div className="px-6 py-6 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                        <div className="flex flex-col sm:flex-row gap-3 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => navigate('/dashboard')}
                                className="sm:w-auto"
                                disabled={isUpdating}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleUpdateProfile}
                                disabled={
                                    isUpdating ||
                                    !!phoneError ||
                                    (studentId === (profile?.student_id || '') &&
                                        phoneNumber === (profile?.phone_number || ''))
                                }
                                className="sm:w-auto"
                            >
                                {isUpdating ? (
                                    <span className="flex items-center">
                                        <svg
                                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                        </svg>
                                        Updating...
                                    </span>
                                ) : (
                                    'Update Student Profile'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProfilePage;
