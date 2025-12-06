import React, {useState} from 'react';
import {useAuth} from '../../hooks/useAuth';
import {useUniversitiesList} from '../../hooks/useUniversitiesList';
import {upsertUniversity, type UpsertUniversityRequest, type University} from '../../services/api/universities';
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
    const {
        universities,
        isLoading,
        error: listError,
        currentPage,
        hasMore,
        totalCount,
        goToNextPage,
        goToPreviousPage,
        refresh,
    } = useUniversitiesList(20);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingUniversity, setEditingUniversity] = useState<University | null>(null);

    // Form state
    const [formData, setFormData] = useState<FormData>({
        university_code: '',
        university_name: '',
        domain: '',
        address: '',
        timezone: 'America/New_York',
        status: 'active',
    });
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleAddClick = () => {
        setEditingUniversity(null);
        setFormData({
            university_code: '',
            university_name: '',
            domain: '',
            address: '',
            timezone: 'America/New_York',
            status: 'active',
        });
        setFormErrors({});
        setSuccessMessage('');
        setShowModal(true);
    };

    const handleEditClick = (university: University) => {
        setEditingUniversity(university);
        setFormData({
            university_code: university.university_code,
            university_name: university.university_name,
            domain: university.domain,
            address: university.address || '',
            timezone: university.timezone,
            status: university.status,
        });
        setFormErrors({});
        setSuccessMessage('');
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingUniversity(null);
        setFormData({
            university_code: '',
            university_name: '',
            domain: '',
            address: '',
            timezone: 'America/New_York',
            status: 'active',
        });
        setFormErrors({});
        setSuccessMessage('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
        // Clear error for this field when user starts typing
        if (formErrors[name as keyof FormErrors]) {
            setFormErrors(prev => ({
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

        setFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMessage('');
        setFormErrors({});

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

            setSuccessMessage(`University ${editingUniversity ? 'updated' : 'created'} successfully!`);

            // Refresh the list
            await refresh();

            // Close modal after a brief delay
            setTimeout(() => {
                handleCloseModal();
            }, 1500);
        } catch (error) {
            console.error('Error saving university:', error);
            if (error instanceof ApiError) {
                setFormErrors({general: error.message});
            } else {
                setFormErrors({general: 'An unexpected error occurred. Please try again.'});
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Universities</h1>
                        <p className="mt-2 text-gray-600">
                            Welcome, {user?.firstName} {user?.lastName}
                        </p>
                        {totalCount > 0 && (
                            <p className="text-sm text-gray-500">Showing {totalCount} universities</p>
                        )}
                    </div>
                    <button
                        onClick={handleAddClick}
                        className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium inline-flex items-center"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                        </svg>
                        Add University
                    </button>
                </div>

                {/* Error State */}
                {listError && (
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6">
                        <p className="font-medium">Error loading universities</p>
                        <p className="text-sm">{listError}</p>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="bg-white rounded-lg shadow-md p-8">
                        <div className="flex justify-center items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                        <p className="text-center text-gray-600 mt-4">Loading universities...</p>
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && !listError && universities.length === 0 && (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <svg
                            className="w-16 h-16 mx-auto text-gray-400 mb-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                        </svg>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Universities Yet</h3>
                        <p className="text-gray-600 mb-6">
                            Get started by adding your first university to the system.
                        </p>
                        <button
                            onClick={handleAddClick}
                            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium inline-flex items-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                            </svg>
                            Add University
                        </button>
                    </div>
                )}

                {/* Universities Table (Desktop) */}
                {!isLoading && !listError && universities.length > 0 && (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        {/* Desktop Table */}
                        <div className="hidden md:block">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Code
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Domain
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {universities.map((university) => (
                                    <tr key={university.university_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {university.university_code}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {university.university_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {university.domain}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                        university.status === 'active'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                    }`}
                                                >
                                                    {university.status === 'active' ? '● Active' : '○ Inactive'}
                                                </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <button
                                                onClick={() => handleEditClick(university)}
                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden divide-y divide-gray-200">
                            {universities.map((university) => (
                                <div key={university.university_id} className="p-4 hover:bg-gray-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {university.university_code}
                                            </h3>
                                            <p className="text-sm text-gray-600">{university.university_name}</p>
                                        </div>
                                        <span
                                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                university.status === 'active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}
                                        >
                                                {university.status === 'active' ? '● Active' : '○ Inactive'}
                                            </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3">{university.domain}</p>
                                    <button
                                        onClick={() => handleEditClick(university)}
                                        className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
                                    >
                                        Edit
                                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M9 5l7 7-7 7"/>
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                                <button
                                    onClick={goToPreviousPage}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ← Previous
                                </button>
                                <span className="text-sm text-gray-700">
                                        Page {currentPage}
                                    </span>
                                <button
                                    onClick={goToNextPage}
                                    disabled={!hasMore}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {editingUniversity ? 'Edit University' : 'Add University'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Success Message */}
                                {successMessage && (
                                    <div
                                        className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
                                        {successMessage}
                                    </div>
                                )}

                                {/* General Error */}
                                {formErrors.general && (
                                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
                                        {formErrors.general}
                                    </div>
                                )}

                                {/* University Code */}
                                <div>
                                    <label htmlFor="university_code"
                                           className="block text-sm font-medium text-gray-700 mb-2">
                                        University Code *
                                    </label>
                                    <input
                                        type="text"
                                        id="university_code"
                                        name="university_code"
                                        value={formData.university_code}
                                        onChange={handleInputChange}
                                        disabled={!!editingUniversity}
                                        className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase ${
                                            formErrors.university_code ? 'border-red-500' : 'border-gray-300'
                                        } ${editingUniversity ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                        placeholder="e.g., PITT"
                                        maxLength={10}
                                    />
                                    {formErrors.university_code && (
                                        <p className="mt-1 text-sm text-red-600">{formErrors.university_code}</p>
                                    )}
                                    <p className="mt-1 text-sm text-gray-500">
                                        {editingUniversity ? 'Code cannot be changed' : '2-10 uppercase alphanumeric characters'}
                                    </p>
                                </div>

                                {/* University Name */}
                                <div>
                                    <label htmlFor="university_name"
                                           className="block text-sm font-medium text-gray-700 mb-2">
                                        University Name *
                                    </label>
                                    <input
                                        type="text"
                                        id="university_name"
                                        name="university_name"
                                        value={formData.university_name}
                                        onChange={handleInputChange}
                                        className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                            formErrors.university_name ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="e.g., University of Pittsburgh"
                                    />
                                    {formErrors.university_name && (
                                        <p className="mt-1 text-sm text-red-600">{formErrors.university_name}</p>
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
                                            formErrors.domain ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="e.g., pitt.edu"
                                    />
                                    {formErrors.domain && (
                                        <p className="mt-1 text-sm text-red-600">{formErrors.domain}</p>
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

                                {/* Submit Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                    >
                                        {isSubmitting ? 'Saving...' : editingUniversity ? 'Update University' : 'Create University'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
