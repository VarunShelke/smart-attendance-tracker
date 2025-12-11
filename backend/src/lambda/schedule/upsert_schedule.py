"""
Upsert Schedule Lambda Handler

Admin/Instructor endpoint to create or update class schedule information.
"""

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict

import boto3
from botocore.exceptions import ClientError
from pydantic import ValidationError

from schedule.shared.model.ScheduleModel import ScheduleModel
from utils.api_response import APIResponse
from utils.auth_utils import require_role, UserRole, AuthorizationError, create_forbidden_response
from utils.request_utils import parse_json_body, extract_path_parameter, validate_required_fields

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables
CLASS_SCHEDULES_TABLE_NAME = os.environ.get('CLASS_SCHEDULES_TABLE_NAME')

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
schedules_table = dynamodb.Table(CLASS_SCHEDULES_TABLE_NAME)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler to create or update class schedule information.

    Args:
        event: API Gateway event containing path parameters, request body, and context
        context: Lambda context object

    Returns:
        API Gateway response with schedule data (201 for create, 200 for update)
    """
    try:
        # Check authorization - Admin or Instructor can upsert schedules
        try:
            user_context = require_role(event, [UserRole.ADMIN, UserRole.INSTRUCTOR])
            logger.info(f"User {user_context['user_id']} authorized with groups: {user_context['groups']}")
        except AuthorizationError as e:
            logger.warning(f"Authorization failed: {str(e)}")
            return create_forbidden_response()

        # Extract path parameters
        university_code, error = extract_path_parameter(event, 'university_code')
        if error:
            return error
        university_code = university_code.upper()

        schedule_id, error = extract_path_parameter(event, 'schedule_id')
        if error:
            return error
        schedule_id = schedule_id.upper()

        logger.info(f"Processing upsert for schedule ID: {schedule_id}")

        # Validate that schedule_id starts with university_code
        expected_prefix = f"{university_code}_"
        if not schedule_id.startswith(expected_prefix):
            logger.warning(f"Schedule ID {schedule_id} does not match university code {university_code}")
            return APIResponse.bad_request(f'Schedule ID must start with {expected_prefix}')

        # Parse request body
        body, error = parse_json_body(event)
        if error:
            return error

        # Validate required fields in body
        error = validate_required_fields(body, ['course_name', 'days_of_week', 'start_time', 'end_time', 'location',
                                                'semester'])
        if error:
            return error

        # Extract course_id from schedule_id (format: UNIVERSITY_COURSEID)
        parts = schedule_id.split('_', 1)
        if len(parts) != 2:
            logger.warning(f"Invalid schedule_id format: {schedule_id}")
            return APIResponse.bad_request('Schedule ID must be in format UNIVERSITYCODE_COURSEID (e.g., PITT_CS2060)')

        course_id = parts[1]

        # Check if schedule_id in body matches path parameter (if provided)
        if 'schedule_id' in body and body['schedule_id'].upper() != schedule_id:
            logger.warning(f"Mismatched schedule_id in path and body")
            return APIResponse.bad_request('Schedule ID in path must match schedule_id in body')

        # Check if schedule already exists
        get_response = schedules_table.get_item(Key={'schedule_id': schedule_id})
        is_update = 'Item' in get_response

        # Instructor ownership validation
        is_instructor_only = UserRole.INSTRUCTOR in user_context['groups'] and UserRole.ADMIN not in user_context[
            'groups']

        if is_instructor_only:
            if is_update:
                # Instructors can only update their own schedules
                existing_schedule = get_response['Item']
                existing_instructor_id = existing_schedule.get('instructor_id')
                if existing_instructor_id and existing_instructor_id != user_context['user_id']:
                    logger.warning(
                        f"Instructor {user_context['user_id']} attempted to modify schedule owned by {existing_instructor_id}")
                    return create_forbidden_response()

        current_time = datetime.now(timezone.utc)

        # Prepare schedule data
        schedule_data = {
            'schedule_id': schedule_id,
            'university_code': university_code,
            'course_id': course_id,
            'course_name': body['course_name'],
            'instructor': body.get('instructor'),
            'instructor_id': body.get('instructor_id'),  # Will be set below for instructors
            'days_of_week': body['days_of_week'],
            'start_time': body['start_time'],
            'end_time': body['end_time'],
            'location': body['location'],
            'semester': body['semester'],
            'created_at': get_response['Item']['created_at'] if is_update else current_time,
            'updated_at': current_time,
        }

        # Auto-set instructor_id for instructor-only users
        if is_instructor_only:
            schedule_data['instructor_id'] = user_context['user_id']

        # Validate using Pydantic model
        try:
            schedule_model = ScheduleModel.from_dict(schedule_data)
        except ValidationError as ve:
            logger.warning(f"Validation error: {str(ve)}")
            return APIResponse.unprocessable_entity('Validation error', errors=ve.errors())

        # Save to DynamoDB
        schedules_table.put_item(Item=schedule_model.to_dynamodb_item())

        logger.info(f"Successfully {'updated' if is_update else 'created'} schedule: {schedule_id}")

        if is_update:
            return APIResponse.ok(schedule_model.to_dict())
        else:
            return APIResponse.created(schedule_model.to_dict())

    except ClientError as e:
        logger.error(f"DynamoDB error: {str(e)}")
        return APIResponse.internal_error('Failed to upsert schedule')

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return APIResponse.internal_error('An unexpected error occurred')
