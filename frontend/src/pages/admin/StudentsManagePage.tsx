/**
 * Students Management Page
 *
 * Admin page for viewing and managing students with pagination.
 * Allows admins to view student enrollments and assign courses.
 *
 * @module pages/admin/StudentsManagePage
 */

import React, {useState} from 'react';
import {useAuth} from '../../hooks/useAuth';
import {useStudentsList} from '../../hooks/useStudentsList';
import {StudentEnrollmentsModal} from '../../components/admin/StudentEnrollmentsModal';
import type {Student} from '../../services/api/students';

export const StudentsManagePage: React.FC = () => {
    const {user} = useAuth();
    const {
        students,
        isLoading,
        error: listError,
        currentPage,
        hasMore,
        goToNextPage,
        goToPreviousPage,
        refresh,
    } = useStudentsList(20);

    // Modal state
    const [showEnrollmentsModal, setShowEnrollmentsModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    const handleViewEnrollments = (student: Student) => {
        setSelectedStudent(student);
        setShowEnrollmentsModal(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Students Management</h1>
                        <p className="text-gray-600 mt-1">View and manage student enrollments</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-600">Welcome,</p>
                        <p className="text-lg font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                    </div>
                </div>

                {/* Error State */}
                {listError && (
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6">
                        <p className="font-medium">Error loading students</p>
                        <p className="text-sm">{listError}</p>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="bg-white rounded-lg shadow-md p-8">
                        <div className="flex justify-center items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                        <p className="text-center text-gray-600 mt-4">Loading students...</p>
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && !listError && students.length === 0 && (
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
                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                        </svg>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Students Yet</h3>
                        <p className="text-gray-600">
                            Students will appear here once they register in the system.
                        </p>
                    </div>
                )}

                {/* Students Table (Desktop) */}
                {!isLoading && !listError && students.length > 0 && (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        {/* Desktop Table */}
                        <div className="hidden md:block">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Student ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Face Registered
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {students.map((student) => (
                                    <tr key={student.user_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {student.first_name} {student.last_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {student.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {student.student_id || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    student.face_registered
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-600'
                                                }`}
                                            >
                                                {student.face_registered ? '✓ Registered' : '✗ Not Registered'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <button
                                                onClick={() => handleViewEnrollments(student)}
                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                View Enrollments
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden divide-y divide-gray-200">
                            {students.map((student) => (
                                <div key={student.user_id} className="p-4 hover:bg-gray-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {student.first_name} {student.last_name}
                                            </h3>
                                            <p className="text-sm text-gray-600">{student.email}</p>
                                        </div>
                                        <span
                                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                student.face_registered
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-600'
                                            }`}
                                        >
                                            {student.face_registered ? '✓ Registered' : '✗ Not Registered'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3">
                                        Student ID: {student.student_id || 'N/A'}
                                    </p>
                                    <button
                                        onClick={() => handleViewEnrollments(student)}
                                        className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
                                    >
                                        View Enrollments
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

            {/* Enrollments Modal */}
            {showEnrollmentsModal && selectedStudent && (
                <StudentEnrollmentsModal
                    student={selectedStudent}
                    isOpen={showEnrollmentsModal}
                    onClose={() => setShowEnrollmentsModal(false)}
                    onEnrollmentsUpdated={refresh}
                />
            )}
        </div>
    );
};
