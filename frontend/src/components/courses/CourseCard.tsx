import React from 'react';
import Button from '../ui/Button';
import type {Course} from '../../types/course';

interface CourseCardProps {
    course: Course;
    onRegisterAttendance: (course: Course) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({course, onRegisterAttendance}) => {
    return (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {course.course_name}
            </h3>
            <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                    <span className="font-medium">Course ID:</span> {course.course_id}
                </p>
                <p className="text-sm text-gray-600">
                    <span className="font-medium">Schedule:</span> {course.schedule_id}
                </p>
                <p className="text-sm text-gray-600">
                    <span className="font-medium">Status:</span>
                    <span
                        className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                            course.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}>
            {course.status}
          </span>
                </p>
            </div>
            <Button
                variant="primary"
                onClick={() => onRegisterAttendance(course)}
                fullWidth
                className="flex items-center justify-center"
            >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                Register Attendance
            </Button>
        </div>
    );
};

export default CourseCard;
