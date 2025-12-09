/**
 * Student Enrollments Modal Component
 *
 * Modal for viewing and managing student course enrollments.
 *
 * @module components/admin/StudentEnrollmentsModal
 */

import React, {useState, useEffect} from 'react';
import {useStudentEnrollments} from '../../hooks/useStudentEnrollments';
import {AssignCoursesForm} from './AssignCoursesForm';
import type {Student} from '../../services/api/students';

interface StudentEnrollmentsModalProps {
    student: Student;
    isOpen: boolean;
    onClose: () => void;
    onEnrollmentsUpdated: () => void;
}

export const StudentEnrollmentsModal: React.FC<StudentEnrollmentsModalProps> = ({
    student,
    isOpen,
    onClose,
    onEnrollmentsUpdated,
}) => {
    const {enrollments, isLoading, error, loadEnrollments, refresh} = useStudentEnrollments();
    const [showAssignCourses, setShowAssignCourses] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadEnrollments(student.user_id);
            setShowAssignCourses(false);
        }
    }, [isOpen, student.user_id, loadEnrollments]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                {/* Modal Header */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Student Enrollments</h2>
                        <p className="text-sm text-gray-600">
                            {student.first_name} {student.last_name} ({student.email})
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6">
                    {/* Loading State */}
                    {isLoading && (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="mt-2 text-gray-600">Loading enrollments...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-4">
                            {error}
                        </div>
                    )}

                    {/* Empty State */}
                    {!isLoading && !error && enrollments.length === 0 && !showAssignCourses && (
                        <div className="text-center py-8">
                            <p className="text-gray-600 mb-4">No enrollments found</p>
                            <button
                                onClick={() => setShowAssignCourses(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                Assign Courses
                            </button>
                        </div>
                    )}

                    {/* Enrollments List */}
                    {!isLoading && enrollments.length > 0 && !showAssignCourses && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Enrolled Courses ({enrollments.length})
                                </h3>
                                <button
                                    onClick={() => setShowAssignCourses(true)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    + Assign More Courses
                                </button>
                            </div>

                            <div className="space-y-3">
                                {enrollments.map((enrollment) => (
                                    <div
                                        key={enrollment.course_id}
                                        className="border border-gray-200 rounded-md p-4 hover:bg-gray-50"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{enrollment.course_name}</h4>
                                                <p className="text-sm text-gray-600">Course ID: {enrollment.course_id}</p>
                                                <p className="text-sm text-gray-600">Schedule: {enrollment.schedule_id}</p>
                                            </div>
                                            <span
                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    enrollment.status === 'active'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}
                                            >
                                                {enrollment.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Enrolled: {new Date(enrollment.enrollment_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Assign Courses Section */}
                    {showAssignCourses && (
                        <AssignCoursesForm
                            student={student}
                            onSuccess={() => {
                                setShowAssignCourses(false);
                                refresh();
                                onEnrollmentsUpdated();
                            }}
                            onCancel={() => setShowAssignCourses(false)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
