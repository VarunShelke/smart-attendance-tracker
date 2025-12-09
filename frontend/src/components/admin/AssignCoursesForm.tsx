/**
 * Assign Courses Form Component
 *
 * Form for assigning multiple courses to a student using checkboxes.
 *
 * @module components/admin/AssignCoursesForm
 */

import React, {useState} from 'react';
import {useSchedulesList} from '../../hooks/useSchedulesList';
import {enrollStudent, type Student} from '../../services/api/students';

interface AssignCoursesFormProps {
    student: Student;
    onSuccess: () => void;
    onCancel: () => void;
}

export const AssignCoursesForm: React.FC<AssignCoursesFormProps> = ({
    student,
    onSuccess,
    onCancel,
}) => {
    const {schedules, isLoading: schedulesLoading} = useSchedulesList();
    const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | undefined>();
    const [successMessage, setSuccessMessage] = useState('');

    const handleCheckboxChange = (scheduleId: string) => {
        setSelectedScheduleIds(prev =>
            prev.includes(scheduleId)
                ? prev.filter(id => id !== scheduleId)
                : [...prev, scheduleId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedScheduleIds.length === 0) {
            setError('Please select at least one course');
            return;
        }

        setIsSubmitting(true);
        setError(undefined);
        setSuccessMessage('');

        try {
            const result = await enrollStudent(student.user_id, {
                schedule_ids: selectedScheduleIds,
            });

            if (result.failed && result.failed.length > 0) {
                const failedCourses = result.failed.map(f => f.schedule_id).join(', ');
                setError(`Some courses failed to enroll: ${failedCourses}`);
            }

            if (result.enrolled && result.enrolled.length > 0) {
                setSuccessMessage(`Successfully enrolled in ${result.enrolled.length} course(s)!`);
                setTimeout(() => {
                    onSuccess();
                }, 1500);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to enroll student');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Courses</h3>

            {/* Success Message */}
            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md mb-4">
                    {successMessage}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Schedules List */}
                {schedulesLoading ? (
                    <div className="text-center py-4 text-gray-600">Loading available courses...</div>
                ) : (
                    <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md p-4 mb-4">
                        {schedules.length === 0 ? (
                            <p className="text-gray-600 text-center">No courses available</p>
                        ) : (
                            <div className="space-y-2">
                                {schedules.map((schedule) => (
                                    <label
                                        key={schedule.schedule_id}
                                        className="flex items-start p-3 hover:bg-gray-50 rounded-md cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedScheduleIds.includes(schedule.schedule_id)}
                                            onChange={() => handleCheckboxChange(schedule.schedule_id)}
                                            className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">{schedule.course_name}</div>
                                            <div className="text-sm text-gray-600">
                                                {schedule.course_id} - {schedule.schedule_id}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {schedule.days_of_week.join(', ')} | {schedule.start_time} - {schedule.end_time} | {schedule.location}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || selectedScheduleIds.length === 0}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {isSubmitting ? 'Enrolling...' : `Enroll in ${selectedScheduleIds.length} Course(s)`}
                    </button>
                </div>
            </form>
        </div>
    );
};
