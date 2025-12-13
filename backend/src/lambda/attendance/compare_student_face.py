import json
import logging
import os
from typing import Dict, Any

from attendance.shared.model import AttendanceStatus
from attendance.shared.utils.attendance_utils import (
    get_student_by_user_id,
    update_attendance_status,
    get_attendance_by_user_and_date
)
from attendance.shared.utils.rekognition_utils import compare_faces_with_rekognition
from constants.constants import FACE_SIMILARITY_THRESHOLD
from utils.sns_utils import publish_attendance_notification

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment variables
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')
STUDENTS_TABLE_NAME = os.environ.get('STUDENTS_TABLE_NAME')
STUDENT_ATTENDANCE_TABLE_NAME = os.environ.get('STUDENT_ATTENDANCE_TABLE_NAME')
SIMILARITY_THRESHOLD = float(os.environ.get('FACE_SIMILARITY_THRESHOLD', FACE_SIMILARITY_THRESHOLD))
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN')


def process_single_message(message: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process a single SQS message for face comparison.

    Args:
        message: SQS message containing tracking_id, user_id, face_s3_key

    Returns:
        dict: Processing result with success status and details

    Raises:
        Exception: For retryable errors (will be sent to DLQ after max retries)
    """
    try:
        # Parse message body
        body = json.loads(message['body'])
        tracking_id = body.get('tracking_id')
        user_id = body.get('user_id')
        attendance_face_s3_key = body.get('face_s3_key')

        logger.info(
            f"Processing message - tracking_id: {tracking_id}, "
            f"user_id: {user_id}, message_id: {message['messageId']}"
        )

        # Validate message fields
        if not all([tracking_id, user_id, attendance_face_s3_key]):
            logger.error(
                f"Invalid message format - tracking_id: {tracking_id}, "
                f"user_id: {user_id}, face_s3_key: {attendance_face_s3_key}"
            )
            return {
                'success': False,
                'error': 'Invalid message format',
                'message_id': message['messageId'],
                'retryable': False
            }

        # Get attendance_date from a message
        attendance_date = body.get('attendance_date')
        if not attendance_date:
            logger.error(f"attendance_date missing from message for tracking_id: {tracking_id}")
            return {
                'success': False,
                'error': 'attendance_date missing from message',
                'message_id': message['messageId'],
                'retryable': False
            }

        # Check if the attendance record is already verified/failed (idempotency)
        try:
            attendance = get_attendance_by_user_and_date(
                STUDENT_ATTENDANCE_TABLE_NAME,
                user_id,
                attendance_date
            )

            if attendance and attendance.status in [AttendanceStatus.VERIFIED, AttendanceStatus.FAILED]:
                logger.info(
                    f"Attendance already processed - tracking_id: {tracking_id}, "
                    f"status: {attendance.status.value}, skipping"
                )
                return {
                    'success': True,
                    'message_id': message['messageId'],
                    'tracking_id': tracking_id,
                    'status': attendance.status.value,
                    'similarity_score': attendance.similarity_score,
                    'skipped': True
                }

        except Exception as e:
            logger.warning(f"Could not check existing attendance: {str(e)}")
            attendance = None

        try:
            student = get_student_by_user_id(STUDENTS_TABLE_NAME, user_id)
        except Exception as e:
            logger.error(f"Failed to get student profile for user {user_id}: {str(e)}")
            raise

        if not student:
            logger.error(f"Student not found for user_id: {user_id}")
            return {
                'success': False,
                'error': 'Student profile not found',
                'message_id': message['messageId'],
                'retryable': False
            }

        if not student.face_registered or not student.face_s3_key:
            logger.error(
                f"Student {user_id} does not have a registered face. "
                f"face_registered: {student.face_registered}, "
                f"face_s3_key: {student.face_s3_key}"
            )
            return {
                'success': False,
                'error': 'No registered face found',
                'message_id': message['messageId'],
                'retryable': False
            }

        registered_face_s3_key = student.face_s3_key

        logger.info(
            f"Comparing faces for user {user_id} - "
            f"Registered: {registered_face_s3_key}, "
            f"Attendance: {attendance_face_s3_key}"
        )

        comparison_result = compare_faces_with_rekognition(
            source_s3_key=registered_face_s3_key,
            target_s3_key=attendance_face_s3_key,
            bucket_name=S3_BUCKET_NAME,
            similarity_threshold=SIMILARITY_THRESHOLD
        )

        if comparison_result.success:
            attendance_status = AttendanceStatus.VERIFIED
            similarity_score = comparison_result.similarity_score
            error_message = None
            logger.info(
                f"Face verified for user {user_id} - "
                f"Similarity: {similarity_score:.2f}%"
            )
        else:
            attendance_status = AttendanceStatus.FAILED
            similarity_score = comparison_result.similarity_score
            error_message = comparison_result.error_message
            logger.warning(
                f"Face verification failed for user {user_id} - "
                f"Error: {error_message}, "
                f"Similarity: {similarity_score}"
            )
        try:
            updated_attendance = update_attendance_status(
                table_name=STUDENT_ATTENDANCE_TABLE_NAME,
                user_id=user_id,
                attendance_date=attendance_date,
                status=attendance_status,
                similarity_score=similarity_score,
                error_message=error_message
            )
            logger.info(
                f"Successfully updated attendance record - "
                f"attendance_id: {updated_attendance.attendance_id}, "
                f"status: {updated_attendance.status.value}"
            )
        except Exception as e:
            logger.error(f"Failed to update attendance record: {str(e)}")
            raise

        try:
            if SNS_TOPIC_ARN:
                publish_attendance_notification(
                    topic_arn=SNS_TOPIC_ARN,
                    status=attendance_status.value,
                    similarity_score=similarity_score,
                    error_message=error_message
                )
                logger.info(
                    f"Published {attendance_status.value} notification for tracking_id: {tracking_id}, "
                    f"similarity: {similarity_score}"
                )
            else:
                logger.warning("SNS_TOPIC_ARN not configured, skipping notification")
        except Exception as e:
            logger.error(f"Failed to send SNS notification: {str(e)}")

        return {
            'success': True,
            'message_id': message['messageId'],
            'tracking_id': tracking_id,
            'status': attendance_status.value,
            'similarity_score': similarity_score
        }

    except Exception as e:
        logger.error(
            f"Error processing message {message['messageId']}: {str(e)}",
            exc_info=True
        )
        raise


def handler(event, context):
    """
    Lambda handler for SQS-triggered face comparison.

    Processes batches of up to 5 messages from the face comparison queue.
    Implements partial batch failure handling to retry only failed messages.

    Args:
        event: SQS event containing Records
        context: Lambda context

    Returns:
        dict: Batch item failures for SQS partial batch failure handling
    """
    logger.info(f"Received {len(event['Records'])} messages for processing")

    batch_item_failures = []

    for record in event['Records']:
        try:
            result = process_single_message(record)

            if not result['success']:
                if result.get('retryable', True):
                    batch_item_failures.append({
                        'itemIdentifier': record['messageId']
                    })
                    logger.warning(
                        f"Message {record['messageId']} failed (retryable): "
                        f"{result.get('error')}"
                    )
                else:
                    logger.error(
                        f"Message {record['messageId']} failed (non-retryable): "
                        f"{result.get('error')}"
                    )
            else:
                logger.info(
                    f"Successfully processed message {record['messageId']} - "
                    f"tracking_id: {result.get('tracking_id')}"
                )

        except Exception as e:
            logger.error(
                f"Unexpected error processing message {record['messageId']}: {str(e)}",
                exc_info=True
            )
            batch_item_failures.append({
                'itemIdentifier': record['messageId']
            })

    logger.info(
        f"Batch processing complete - "
        f"Success: {len(event['Records']) - len(batch_item_failures)}, "
        f"Failed: {len(batch_item_failures)}"
    )

    return {
        'batchItemFailures': batch_item_failures
    }
