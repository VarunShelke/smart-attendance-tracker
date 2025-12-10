import base64
import json
import logging
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from attendance.shared.model import AttendanceModel, AttendanceStatus
from student.shared.model import StudentModel
from utils.aws_utils import get_client_for_resource, get_dynamodb_resource

logger = logging.getLogger()


def generate_tracking_id() -> str:
    """Generate a unique tracking ID for attendance requests."""
    return str(uuid.uuid4())


def upload_attendance_face_to_s3(
        bucket_name: str,
        user_id: str,
        tracking_id: str,
        image_base64: str
) -> str:
    try:
        # Decode base64 image
        image_bytes = base64.b64decode(image_base64)
    except Exception as e:
        raise ValueError(f"Invalid base64 image data: {str(e)}")

    # Generate S3 key
    s3_key = f"faces/attendance/{user_id}/{tracking_id}.jpg"

    # Upload to S3
    s3_client = get_client_for_resource('s3')
    try:
        s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=image_bytes,
            ContentType='image/jpeg'
        )
    except Exception as e:
        raise Exception(f"Failed to upload image to S3: {str(e)}")

    return s3_key


def get_student_by_user_id(table_name: str, user_id: str) -> Optional[StudentModel]:
    dynamodb = get_dynamodb_resource()
    table = dynamodb.Table(table_name)

    try:
        response = table.get_item(Key={'user_id': user_id})
        if 'Item' in response:
            return StudentModel.from_dynamodb_item(response['Item'])
        return None
    except Exception as e:
        raise Exception(f"Failed to retrieve student from DynamoDB: {str(e)}")


def create_processing_attendance_record(
        table_name: str,
        user_id: str,
        tracking_id: str,
        face_s3_key: str,
        course_id: Optional[str] = None,
        schedule_id: Optional[str] = None
) -> AttendanceModel:
    now = datetime.now()

    # Create attendance model
    attendance = AttendanceModel(
        user_id=user_id,
        attendance_date=now,
        tracking_id=tracking_id,
        face_s3_key=face_s3_key,
        course_id=course_id,
        schedule_id=schedule_id,
        status=AttendanceStatus.PROCESSING,
        created_at=now
    )

    # Write to DynamoDB
    dynamodb = get_dynamodb_resource()
    table = dynamodb.Table(table_name)

    try:
        table.put_item(Item=attendance.to_dynamodb_item())
    except Exception as e:
        raise Exception(f"Failed to create attendance record in DynamoDB: {str(e)}")

    return attendance


def send_to_comparison_queue(
        queue_url: str,
        user_id: str,
        tracking_id: str,
        face_s3_key: str,
        attendance_date: str,
        course_id: Optional[str] = None,
        schedule_id: Optional[str] = None
) -> None:
    """
    Send a message to SQS queue for face comparison processing.

    Args:
        queue_url: SQS queue URL
        user_id: Cognito user ID
        tracking_id: Unique tracking ID
        face_s3_key: S3 key of the uploaded face image
        attendance_date: Attendance date in ISO format
        course_id: Course ID (optional)
        schedule_id: Schedule ID (optional)

    Raises:
        Exception: If SQS send fails
    """
    sqs_client = get_client_for_resource('sqs')

    message_body = {
        'tracking_id': tracking_id,
        'user_id': user_id,
        'face_s3_key': face_s3_key,
        'attendance_date': attendance_date,
        'course_id': course_id,
        'schedule_id': schedule_id
    }

    try:
        sqs_client.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps(message_body)
        )
    except Exception as e:
        raise Exception(f"Failed to send message to SQS: {str(e)}")


def get_attendance_by_tracking_id(table_name: str, tracking_id: str) -> Optional[AttendanceModel]:
    """
    Retrieve attendance record by tracking ID using GSI.

    Args:
        table_name: DynamoDB table name
        tracking_id: Unique tracking ID

    Returns:
        AttendanceModel if found, None otherwise

    Raises:
        Exception: If DynamoDB query fails
    """
    dynamodb = get_dynamodb_resource()
    table = dynamodb.Table(table_name)

    try:
        response = table.query(
            IndexName='attendance-id-index',
            KeyConditionExpression='attendance_id = :tracking_id',
            ExpressionAttributeValues={
                ':tracking_id': tracking_id
            },
            Limit=1
        )

        items = response.get('Items', [])
        if items:
            return AttendanceModel.from_dynamodb_item(items[0])
        return None

    except Exception as e:
        logger.error(f"Failed to query attendance by tracking_id {tracking_id}: {str(e)}")
        raise Exception(f"Failed to retrieve attendance record: {str(e)}")


def update_attendance_status(
        table_name: str,
        user_id: str,
        attendance_date: str,
        status: AttendanceStatus,
        similarity_score: Optional[float] = None,
        error_message: Optional[str] = None
) -> AttendanceModel:
    """
    Update attendance record with verification results.

    Args:
        table_name: DynamoDB table name
        user_id: User ID (partition key)
        attendance_date: Attendance date ISO string (sort key)
        status: New attendance status (VERIFIED or FAILED)
        similarity_score: Face similarity score (0-100) if available
        error_message: Error message if status is FAILED

    Returns:
        Updated AttendanceModel

    Raises:
        Exception: If DynamoDB update fails
    """
    dynamodb = get_dynamodb_resource()
    table = dynamodb.Table(table_name)

    now = datetime.now()
    update_expression_parts = ["SET #status = :status, updated_at = :updated_at"]
    expression_attribute_names = {"#status": "status"}
    expression_attribute_values = {
        ":status": status.value,
        ":updated_at": now.isoformat()
    }

    # Add a verified_at timestamp
    update_expression_parts.append("verified_at = :verified_at")
    expression_attribute_values[":verified_at"] = now.isoformat()

    # Add similarity_score if provided (convert float to Decimal for DynamoDB)
    if similarity_score is not None:
        update_expression_parts.append("similarity_score = :similarity_score")
        expression_attribute_values[":similarity_score"] = Decimal(str(similarity_score))

    # Add error_message if provided
    if error_message is not None:
        update_expression_parts.append("error_message = :error_message")
        expression_attribute_values[":error_message"] = error_message

    update_expression = ", ".join(update_expression_parts)

    try:
        response = table.update_item(
            Key={
                'user_id': user_id,
                'attendance_date': attendance_date
            },
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
            ReturnValues='ALL_NEW'
        )

        updated_item = response.get('Attributes', {})
        return AttendanceModel.from_dynamodb_item(updated_item)

    except Exception as e:
        logger.error(
            f"Failed to update attendance for user {user_id}, "
            f"date {attendance_date}: {str(e)}"
        )
        raise Exception(f"Failed to update attendance record: {str(e)}")


def get_attendance_by_user_and_date(
        table_name: str,
        user_id: str,
        attendance_date: str
) -> Optional[AttendanceModel]:
    """
    Retrieve attendance record by user_id and attendance_date.

    Args:
        table_name: DynamoDB table name
        user_id: User ID (partition key)
        attendance_date: Attendance date ISO string (sort key)

    Returns:
        AttendanceModel if found, None otherwise

    Raises:
        Exception: If DynamoDB query fails
    """
    dynamodb = get_dynamodb_resource()
    table = dynamodb.Table(table_name)

    try:
        response = table.get_item(
            Key={
                'user_id': user_id,
                'attendance_date': attendance_date
            }
        )

        if 'Item' in response:
            return AttendanceModel.from_dynamodb_item(response['Item'])
        return None

    except Exception as e:
        logger.error(
            f"Failed to get attendance for user {user_id}, "
            f"date {attendance_date}: {str(e)}"
        )
        raise Exception(f"Failed to retrieve attendance record: {str(e)}")
