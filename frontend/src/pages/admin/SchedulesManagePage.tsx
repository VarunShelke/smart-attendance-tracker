import React, {useState} from 'react';
import {useAuth} from '../../hooks/useAuth';
import {upsertSchedule, type UpsertScheduleRequest} from '../../services/api/schedules';
import {ApiError} from '../../services/api/errors';

interface FormData {
    university_code: string;
    course_id: string;
    course_name: string;
    instructor: string;
    days_of_week: string[];
    start_time: string;
    end_time: string;
    location: string;
    semester: string;
}

interface FormErrors {
    university_code?: string;
    course_id?: string;
    course_name?: string;
    days_of_week?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    semester?: string;
    general?: string;
}

const DAYS = [
    {value: 'MON', label: 'Monday'},
    {value: 'TUE', label: 'Tuesday'},
    {value: 'WED', label: 'Wednesday'},
    {value: 'THU', label: 'Thursday'},
    {value: 'FRI', label: 'Friday'},
    {value: 'SAT', label: 'Saturday'},
    {value: 'SUN', label: 'Sunday'},
];

export const SchedulesManagePage: React.FC = () => {
    const {user} = useAuth();
    const [formData, setFormData] = useState<FormData>({
        university_code: '',
        course_id: '',
        course_name: '',
        instructor: '',
        days_of_week: [],
        start_time: '',
        end_time: '',
        location: '',
        semester: '',
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

    const handleDayToggle = (day: string) => {
        setFormData(prev => {
            const newDays = prev.days_of_week.includes(day)
                ? prev.days_of_week.filter(d => d !== day)
                : [...prev.days_of_week, day];
            return {...prev, days_of_week: newDays};
        });
        if (errors.days_of_week) {
            setErrors(prev => ({...prev, days_of_week: undefined}));
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

        if (!formData.course_id.trim()) {
            newErrors.course_id = 'Course ID is required';
        } else if (!/^[A-Z0-9]{2,20}$/.test(formData.course_id)) {
            newErrors.course_id = 'Course ID must be 2-20 uppercase alphanumeric characters';
        }

        if (!formData.course_name.trim()) {
            newErrors.course_name = 'Course name is required';
        }

        if (formData.days_of_week.length === 0) {
            newErrors.days_of_week = 'Select at least one day';
        }

        if (!formData.start_time) {
            newErrors.start_time = 'Start time is required';
        }

        if (!formData.end_time) {
            newErrors.end_time = 'End time is required';
        }

        if (formData.start_time && formData.end_time && formData.start_time >= formData.end_time) {
            newErrors.end_time = 'End time must be after start time';
        }

        if (!formData.location.trim()) {
            newErrors.location = 'Location is required';
        }

        if (!formData.semester.trim()) {
            newErrors.semester = 'Semester is required';
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
            const scheduleId = `${formData.university_code.toUpperCase()}_${formData.course_id.toUpperCase()}`;

            const requestData: UpsertScheduleRequest = {
                course_name: formData.course_name.trim(),
                instructor: formData.instructor.trim() || undefined,
                days_of_week: formData.days_of_week,
                start_time: formData.start_time,
                end_time: formData.end_time,
                location: formData.location.trim(),
                semester: formData.semester.trim(),
            };

            await upsertSchedule(formData.university_code.toUpperCase(), scheduleId, requestData);

            setSuccessMessage('Schedule saved successfully!');
            // Reset form
            setFormData({
                university_code: '',
                course_id: '',
                course_name: '',
                instructor: '',
                days_of_week: [],
                start_time: '',
                end_time: '',
                location: '',
                semester: '',
            });
        } catch (error) {
            console.error('Error saving schedule:', error);
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
                    <h1 className="text-3xl font-bold text-gray-900">Manage Class Schedules</h1>
                    <p className="mt-2 text-gray-600">
                        Welcome, {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">Add or update class schedule information</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Schedule Details</h2>

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
                        </div>

                        {/* Course ID */}
                        <div>
                            <label htmlFor="course_id" className="block text-sm font-medium text-gray-700 mb-2">
                                Course ID *
                            </label>
                            <input
                                type="text"
                                id="course_id"
                                name="course_id"
                                value={formData.course_id}
                                onChange={handleInputChange}
                                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase ${
                                    errors.course_id ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="e.g., CS2060"
                                maxLength={20}
                            />
                            {errors.course_id && (
                                <p className="mt-1 text-sm text-red-600">{errors.course_id}</p>
                            )}
                            <p className="mt-1 text-sm text-gray-500">2-20 uppercase alphanumeric characters</p>
                        </div>

                        {/* Course Name */}
                        <div>
                            <label htmlFor="course_name" className="block text-sm font-medium text-gray-700 mb-2">
                                Course Name *
                            </label>
                            <input
                                type="text"
                                id="course_name"
                                name="course_name"
                                value={formData.course_name}
                                onChange={handleInputChange}
                                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    errors.course_name ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="e.g., Introduction to Computer Science"
                            />
                            {errors.course_name && (
                                <p className="mt-1 text-sm text-red-600">{errors.course_name}</p>
                            )}
                        </div>

                        {/* Instructor */}
                        <div>
                            <label htmlFor="instructor" className="block text-sm font-medium text-gray-700 mb-2">
                                Instructor Name (Optional)
                            </label>
                            <input
                                type="text"
                                id="instructor"
                                name="instructor"
                                value={formData.instructor}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., Dr. John Smith"
                            />
                        </div>

                        {/* Days of Week */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Days of Week *
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {DAYS.map(day => (
                                    <button
                                        key={day.value}
                                        type="button"
                                        onClick={() => handleDayToggle(day.value)}
                                        className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                                            formData.days_of_week.includes(day.value)
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                            {errors.days_of_week && (
                                <p className="mt-1 text-sm text-red-600">{errors.days_of_week}</p>
                            )}
                        </div>

                        {/* Time Range */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-2">
                                    Start Time *
                                </label>
                                <input
                                    type="time"
                                    id="start_time"
                                    name="start_time"
                                    value={formData.start_time}
                                    onChange={handleInputChange}
                                    className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                        errors.start_time ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                />
                                {errors.start_time && (
                                    <p className="mt-1 text-sm text-red-600">{errors.start_time}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-2">
                                    End Time *
                                </label>
                                <input
                                    type="time"
                                    id="end_time"
                                    name="end_time"
                                    value={formData.end_time}
                                    onChange={handleInputChange}
                                    className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                        errors.end_time ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                />
                                {errors.end_time && (
                                    <p className="mt-1 text-sm text-red-600">{errors.end_time}</p>
                                )}
                            </div>
                        </div>

                        {/* Location */}
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                                Location *
                            </label>
                            <input
                                type="text"
                                id="location"
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    errors.location ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="e.g., Room 301, Science Building"
                            />
                            {errors.location && (
                                <p className="mt-1 text-sm text-red-600">{errors.location}</p>
                            )}
                        </div>

                        {/* Semester */}
                        <div>
                            <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-2">
                                Semester *
                            </label>
                            <input
                                type="text"
                                id="semester"
                                name="semester"
                                value={formData.semester}
                                onChange={handleInputChange}
                                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    errors.semester ? 'border-red-500' : 'border-gray-300'
                                }`}
                                placeholder="e.g., Fall 2025"
                            />
                            {errors.semester && (
                                <p className="mt-1 text-sm text-red-600">{errors.semester}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Schedule'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
