import base64
import uuid
from datetime import datetime
from typing import Optional

from attendance.shared.model import AttendanceModel, AttendanceStatus
from student.shared.model import StudentModel
from utils.aws_utils import get_client_for_resource, get_dynamodb_resource


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
        face_s3_key: str
) -> AttendanceModel:
    now = datetime.now()

    # Create attendance model
    attendance = AttendanceModel(
        user_id=user_id,
        attendance_date=now,
        tracking_id=tracking_id,
        face_s3_key=face_s3_key,
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


def send_to_comparison_queue(queue_url: str, user_id: str, tracking_id: str, face_s3_key: str) -> None:
    """
    Send a message to SQS queue for face comparison processing.

    Args:
        queue_url: SQS queue URL
        user_id: Cognito user ID
        tracking_id: Unique tracking ID
        face_s3_key: S3 key of the uploaded face image

    Raises:
        Exception: If SQS send fails
    """
    import json

    sqs_client = get_client_for_resource('sqs')

    message_body = {
        'tracking_id': tracking_id,
        'user_id': user_id,
        'face_s3_key': face_s3_key
    }

    try:
        sqs_client.send_message(
            QueueUrl=queue_url,
            MessageBody=json.dumps(message_body)
        )
    except Exception as e:
        raise Exception(f"Failed to send message to SQS: {str(e)}")
