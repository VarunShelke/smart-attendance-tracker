import React, {useState} from 'react';
import {useAuth} from '../../hooks/useAuth';
import {upsertUniversity, type UpsertUniversityRequest} from '../../services/api/universities';
import {ApiError} from '../../services/api/errors';

interface FormData {
    university_code: string;
    university_name: string;
    domain: string;
    address: string;
    timezone: string;
    status: string;
}

interface FormErrors {
    university_code?: string;
    university_name?: string;
    domain?: string;
    general?: string;
}

export const UniversitiesManagePage: React.FC = () => {
    const {user} = useAuth();
    const [formData, setFormData] = useState<FormData>({
        university_code: '',
        university_name: '',
        domain: '',
        address: '',
        timezone: 'America/New_York',
        status: 'active',
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
        // Clear error for this field when user starts typing
        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({
                ...prev,
                [name]: undefined,
            }));
        }
        setSuccessMessage('');
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.university_code.trim()) {
            newErrors.university_code = 'University code is required';
        } else if (!/^[A-Z0-9]{2,10}$/.test(formData.university_code)) {
            newErrors.university_code = 'University code must be 2-10 uppercase alphanumeric characters';
        }

        if (!formData.university_name.trim()) {
            newErrors.university_name = 'University name is required';
        }

        if (!formData.domain.trim()) {
            newErrors.domain = 'Email domain is required';
        } else if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(formData.domain)) {
            newErrors.domain = 'Invalid email domain format (e.g., pitt.edu)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMessage('');
        setErrors({});

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const requestData: UpsertUniversityRequest = {
                university_name: formData.university_name.trim(),
                domain: formData.domain.trim().toLowerCase(),
                status: formData.status,
                address: formData.address.trim() || undefined,
                timezone: formData.timezone,
            };

            await upsertUniversity(formData.university_code.toUpperCase(), requestData);

            setSuccessMessage('University saved successfully!');
            // Reset form
            setFormData({
                university_code: '',
                university_name: '',
                domain: '',
                address: '',
                timezone: 'America/New_York',
                status: 'active',
            });
        } catch (error) {
            console.error('Error saving university:', error);
            if (error instanceof ApiError) {
                setErrors({general: error.message});
            } else {
                setErrors({general: 'An unexpected error occurred. Please try again.'});
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Manage Universities</h1>
                    <p className="mt-2 text-gray-600">
                        Welcome, {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">Add or update university information</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">University Details</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Success Message */}
                        {successMessage && (
                            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
                                {successMessage}
                            </div>
                        )}

                        {/* General Error */}
                        {errors.general && (
                            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
                                {errors.general}
                            </div>
                        )}

                        {/* University Code */}
                        <div>
                            <label htmlFor="university_code" className="block text-sm font-medium text-gray-700 mb-2">
                                University Code *
                            </label>
                            <input
                                type="text"
                                id="university_code"
                                name="university_code"
                                value={formData.university_code}
                                onChange={handleInputChange}
                                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase ${
                                    errors.university_code ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="e.g., PITT"
                                maxLength={10}
                            />
                            {errors.university_code && (
                                <p className="mt-1 text-sm text-red-600">{errors.university_code}</p>
                            )}
                            <p className="mt-1 text-sm text-gray-500">2-10 uppercase alphanumeric characters</p>
                        </div>

                        {/* University Name */}
                        <div>
                            <label htmlFor="university_name" className="block text-sm font-medium text-gray-700 mb-2">
                                University Name *
                            </label>
                            <input
                                type="text"
                                id="university_name"
                                name="university_name"
                                value={formData.university_name}
                                onChange={handleInputChange}
                                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    errors.university_name ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="e.g., University of Pittsburgh"
                            />
                            {errors.university_name && (
                                <p className="mt-1 text-sm text-red-600">{errors.university_name}</p>
                            )}
                        </div>

                        {/* Email Domain */}
                        <div>
                            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
                                Email Domain *
                            </label>
                            <input
                                type="text"
                                id="domain"
                                name="domain"
                                value={formData.domain}
                                onChange={handleInputChange}
                                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    errors.domain ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="e.g., pitt.edu"
                            />
                            {errors.domain && (
                                <p className="mt-1 text-sm text-red-600">{errors.domain}</p>
                            )}
                            <p className="mt-1 text-sm text-gray-500">Email domain for student verification</p>
                        </div>

                        {/* Address */}
                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                                Address (Optional)
                            </label>
                            <textarea
                                id="address"
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="University address"
                            />
                        </div>

                        {/* Timezone */}
                        <div>
                            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                                Timezone
                            </label>
                            <select
                                id="timezone"
                                name="timezone"
                                value={formData.timezone}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="America/New_York">Eastern Time (ET)</option>
                                <option value="America/Chicago">Central Time (CT)</option>
                                <option value="America/Denver">Mountain Time (MT)</option>
                                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                                <option value="America/Anchorage">Alaska Time (AKT)</option>
                                <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                            </select>
                        </div>

                        {/* Status */}
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                                Status
                            </label>
                            <select
                                id="status"
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                                {isSubmitting ? 'Saving...' : 'Save University'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
