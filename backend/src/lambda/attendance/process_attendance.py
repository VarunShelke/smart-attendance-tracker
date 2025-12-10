import base64
import json
import logging
import os
from typing import Dict, Any

from attendance.shared.utils import (
    generate_tracking_id,
    upload_attendance_face_to_s3,
    get_student_by_user_id,
    create_processing_attendance_record,
    send_to_comparison_queue
)
from utils.request_utils import create_response

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')
STUDENTS_TABLE_NAME = os.environ.get('STUDENTS_TABLE_NAME')
STUDENT_ATTENDANCE_TABLE_NAME = os.environ.get('STUDENT_ATTENDANCE_TABLE_NAME')
FACE_COMPARISON_QUEUE_URL = os.environ.get('FACE_COMPARISON_QUEUE_URL')
API_VERSION = os.environ.get('API_VERSION', 'v1')


def validate_request(event: Dict[str, Any]) -> Dict[str, Any] | None:
    """
    Validate the incoming request.

    Returns:
        Error response dict if validation fails, None if valid
    """
    http_method = event.get('httpMethod', '').upper()

    if http_method == 'OPTIONS':
        return create_response(200, {'message': 'CORS preflight successful'})

    if http_method != 'POST':
        return create_response(405, {
            'error': 'Method Not Allowed',
            'message': f'HTTP method {http_method} is not supported. Use POST.'
        })

    if not event.get('body'):
        return create_response(400, {
            'error': 'Bad Request',
            'message': 'Request body is required'
        })

    return None


def handler(event, context):
    try:
        validation_error = validate_request(event)
        if validation_error:
            return validation_error

        body_str = event['body']
        if event.get('isBase64Encoded', False):
            body_str = base64.b64decode(body_str).decode('utf-8')

        try:
            body = json.loads(body_str)
        except json.JSONDecodeError:
            return create_response(400, {
                'error': 'Bad Request',
                'message': 'Invalid JSON in request body'
            })

        authorizer_claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = authorizer_claims.get('sub')

        if not user_id:
            return create_response(401, {
                'error': 'Unauthorized',
                'message': 'User not authenticated'
            })

        face_image = body.get('faceImage')
        if not face_image:
            return create_response(400, {
                'error': 'Bad Request',
                'message': 'faceImage is required'
            })

        course_id = body.get('course_id')
        schedule_id = body.get('schedule_id')

        if len(face_image) > 13 * 1024 * 1024:
            return create_response(413, {
                'error': 'Payload Too Large',
                'message': 'Image size exceeds 13MB limit'
            })

        logger.info(f"Processing attendance for user_id: {user_id}")

        student = get_student_by_user_id(STUDENTS_TABLE_NAME, user_id)
        if not student:
            return create_response(404, {
                'error': 'Not Found',
                'message': 'Student profile not found'
            })

        if not student.face_registered:
            return create_response(400, {
                'error': 'Face Not Registered',
                'message': 'Please register your face first before marking attendance'
            })

        tracking_id = generate_tracking_id()
        logger.info(f"Generated tracking_id: {tracking_id}")

        try:
            face_s3_key = upload_attendance_face_to_s3(
                S3_BUCKET_NAME,
                user_id,
                tracking_id,
                face_image
            )
            logger.info(f"Uploaded face image to S3: {face_s3_key}")
        except ValueError as e:
            return create_response(400, {
                'error': 'Invalid Image',
                'message': str(e)
            })
        except Exception as e:
            logger.error(f"S3 upload failed: {str(e)}")
            return create_response(500, {
                'error': 'Internal Server Error',
                'message': 'Failed to upload face image'
            })

        try:
            attendance = create_processing_attendance_record(
                STUDENT_ATTENDANCE_TABLE_NAME,
                user_id,
                tracking_id,
                face_s3_key,
                course_id,
                schedule_id
            )
            logger.info(f"Created attendance record: {attendance.attendance_id}")
        except Exception as e:
            logger.error(f"DynamoDB write failed: {str(e)}")
            return create_response(500, {
                'error': 'Internal Server Error',
                'message': 'Failed to create attendance record'
            })

        try:
            send_to_comparison_queue(
                FACE_COMPARISON_QUEUE_URL,
                user_id,
                tracking_id,
                face_s3_key,
                attendance.attendance_date.isoformat(),
                course_id,
                schedule_id
            )
            logger.info(f"Sent message to SQS queue for tracking_id: {tracking_id}")
        except Exception as e:
            logger.error(f"SQS send failed: {str(e)}")
            return create_response(500, {
                'error': 'Internal Server Error',
                'message': 'Failed to queue attendance verification'
            })

        return create_response(200, {
            'tracking_id': tracking_id,
            'status': 'processing',
            'message': 'Attendance verification in progress. You will receive an email notification with the results shortly.'
        })

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return create_response(500, {
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred'
        })
