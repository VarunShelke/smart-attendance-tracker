"""
Enroll Student Lambda Handler

Admin-only endpoint to enroll students in courses.
"""

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict

import boto3
from botocore.exceptions import ClientError

from schedule.shared.model.ScheduleModel import ScheduleModel
from student.shared.model.StudentCoursesModel import StudentCourseModel
from utils.api_response import APIResponse
from utils.auth_utils import require_role, UserRole, AuthorizationError, create_forbidden_response
from utils.request_utils import parse_json_body, extract_path_parameter

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables
STUDENT_COURSES_TABLE_NAME = os.environ.get('STUDENT_COURSES_TABLE_NAME')
CLASS_SCHEDULES_TABLE_NAME = os.environ.get('CLASS_SCHEDULES_TABLE_NAME')

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
student_courses_table = dynamodb.Table(STUDENT_COURSES_TABLE_NAME)
class_schedules_table = dynamodb.Table(CLASS_SCHEDULES_TABLE_NAME)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler to enroll a student in one or more courses.
    Admin-only endpoint.

    Args:
        event: API Gateway event containing path parameters, body, and request context
        context: Lambda context object

    Returns:
        API Gateway response with enrollment results
    """
    try:
        # Check authorization - only Admin can enroll students
        try:
            user_context = require_role(event, [UserRole.ADMIN])
            logger.info(f"User {user_context['user_id']} authorized as Admin for enroll student")
        except AuthorizationError as e:
            logger.warning(f"Authorization failed: {str(e)}")
            return create_forbidden_response()

        # Extract path parameters
        user_id, error = extract_path_parameter(event, 'user_id')
        if error:
            return error

        # Parse request body
        body, error = parse_json_body(event)
        if error:
            return error

        schedule_ids = body.get('schedule_ids', [])

        if not schedule_ids or not isinstance(schedule_ids, list):
            logger.warning("Missing or invalid schedule_ids in request body")
            return APIResponse.bad_request('schedule_ids must be a non-empty array')

        logger.info(f"Enrolling student {user_id} in {len(schedule_ids)} courses")

        enrolled = []
        failed = []

        # Process each schedule_id
        for schedule_id in schedule_ids:
            try:
                # Fetch schedule details from class_schedules table
                schedule_response = class_schedules_table.get_item(
                    Key={'schedule_id': schedule_id}
                )

                if 'Item' not in schedule_response:
                    logger.warning(f"Schedule not found: {schedule_id}")
                    failed.append({
                        'schedule_id': schedule_id,
                        'error': 'Schedule not found'
                    })
                    continue

                schedule_item = schedule_response['Item']
                schedule = ScheduleModel.from_dynamodb_item(schedule_item)

                # Check if already enrolled
                try:
                    existing_response = student_courses_table.get_item(
                        Key={
                            'user_id': user_id,
                            'course_id': schedule.course_id
                        }
                    )

                    if 'Item' in existing_response:
                        logger.info(f"Student {user_id} already enrolled in course {schedule.course_id}")
                        # Return existing enrollment as success
                        existing_enrollment = StudentCourseModel.from_dynamodb_item(existing_response['Item'])
                        enrolled.append(existing_enrollment.to_dict())
                        continue
                except ClientError as e:
                    logger.error(f"Error checking existing enrollment: {str(e)}")

                # Create enrollment record
                enrollment_date = datetime.now(timezone.utc).isoformat()
                enrollment = StudentCourseModel(
                    user_id=user_id,
                    course_id=schedule.course_id,
                    course_name=schedule.course_name,
                    schedule_id=schedule.schedule_id,
                    enrollment_date=enrollment_date,
                    status='active'
                )

                # Save to DynamoDB
                student_courses_table.put_item(Item=enrollment.to_dynamodb_item())

                enrolled.append(enrollment.to_dict())
                logger.info(f"Successfully enrolled student {user_id} in course {schedule.course_id}")

            except Exception as e:
                logger.error(f"Error enrolling in schedule {schedule_id}: {str(e)}")
                failed.append({
                    'schedule_id': schedule_id,
                    'error': str(e)
                })

        logger.info(f"Enrollment complete. Enrolled: {len(enrolled)}, Failed: {len(failed)}")

        return APIResponse.ok({
            'enrolled': enrolled,
            'failed': failed
        })

    except ClientError as e:
        logger.error(f"DynamoDB error: {str(e)}")
        return APIResponse.internal_error('Failed to enroll student')

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return APIResponse.internal_error('An unexpected error occurred')
