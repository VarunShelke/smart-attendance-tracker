import React, {useEffect, useState} from 'react';
import type {Course} from '../../types/course';
import {getStudentCourses} from '../../services/api';
import CourseCard from './CourseCard';

interface CoursesListProps {
    onRegisterAttendance: (course: Course) => void;
}

const CoursesList: React.FC<CoursesListProps> = ({onRegisterAttendance}) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await getStudentCourses();
            setCourses(data);
        } catch (err) {
            setError('Failed to load courses. Please try again.');
            console.error('Error fetching courses:', err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-primary-600"
                         xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10"
                                stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <p className="text-gray-600">Loading courses...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <svg className="w-12 h-12 mx-auto mb-4 text-red-600" fill="none"
                     stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p className="text-red-800 font-medium mb-2">{error}</p>
                <button onClick={fetchCourses}
                        className="text-red-600 hover:text-red-700 underline">
                    Try again
                </button>
            </div>
        );
    }

    if (courses.length === 0) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none"
                     stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Courses Yet
                </h3>
                <p className="text-gray-600">
                    You are not enrolled in any courses yet.
                </p>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
                My Courses
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                    <CourseCard
                        key={course.course_id}
                        course={course}
                        onRegisterAttendance={onRegisterAttendance}
                    />
                ))}
            </div>
        </div>
    );
};

export default CoursesList;
